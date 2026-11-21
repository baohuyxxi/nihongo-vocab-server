import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import KaiwaDialogue from "../models/KaiwaDialogue.js";
import KaiwaQuestion from "../models/KaiwaQuestion.js";
import { fail, objectId } from "../services/kaiwa.service.js";

import { createKaiwaContent, validateKaiwaContent } from "../services/kaiwaAdmin.service.js";

async function readData(file) {
  if (!file) fail(400, "Provide a JSON file");
  return JSON.parse(await readFile(file, "utf8"));
}

async function checkDialogueReferences(dialogue, deleting) {
  const references = await KaiwaQuestion.find({ dialogueId: dialogue._id })
    .select("textbook lesson source sourceLineId").lean();
  const lineIds = new Set(dialogue.lines.map((line) => line.id));
  if (references.some((question) =>
    deleting || question.textbook !== dialogue.textbook || question.lesson !== dialogue.lesson ||
    (question.source === "textbook" && dialogue.source !== "textbook") ||
    (question.sourceLineId && !lineIds.has(question.sourceLineId))
  )) fail(409, "Change would invalidate a question's dialogue reference");
}

async function run() {
  const [resource, action, argument, file] = process.argv.slice(2);
  const model = { dialogues: KaiwaDialogue, questions: KaiwaQuestion }[resource];
  if (![KaiwaDialogue, KaiwaQuestion].includes(model) ||
      !["list", "get", "create", "update", "delete", "import"].includes(action)) {
    fail(400, "Usage: node src/scripts/kaiwaAdmin.js <dialogues|questions> <list|get ID|create FILE|update ID FILE|delete ID|import ID FILE>");
  }
  const uri = process.env.KAIWA_ADMIN_MONGO_URI;
  if (!uri) fail(400, "Set KAIWA_ADMIN_MONGO_URI to the intended database");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([KaiwaDialogue.init(), KaiwaQuestion.init()]);

  if (action === "list") return model.find().sort({ textbook: 1, lesson: 1, _id: 1 }).lean();
  if (action === "create") return createKaiwaContent(model, await readData(argument));

  const id = objectId(argument);
  const existing = await model.findById(id);
  if (action === "import") {
    if (existing) return { skipped: true, id };
    const data = validateKaiwaContent(model, await readData(file));
    if (resource === "dialogues" && await model.exists({ textbook: data.textbook, lesson: data.lesson })) {
      return { skipped: true, textbook: data.textbook, lesson: data.lesson };
    }
    return model.create({ ...data, _id: id });
  }
  if (!existing) fail(404, "Kaiwa record not found");
  if (action === "get") return existing;
  if (action === "delete") {
    if (resource === "dialogues") await checkDialogueReferences(existing, true);
    await existing.deleteOne();
    return { deleted: true, id };
  }

  existing.set(validateKaiwaContent(model, await readData(file)));
  if (resource === "dialogues") {
    await existing.validate();
    await checkDialogueReferences(existing, false);
  }
  return existing.save();
}

try {
  console.log(JSON.stringify(await run(), null, 2));
} catch (error) {
  const message = error.code === 11000 ? "Duplicate Kaiwa record" :
    error.status || ["ValidationError", "StrictModeError"].includes(error.name)
      ? error.message : error.name;
  console.error(message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
