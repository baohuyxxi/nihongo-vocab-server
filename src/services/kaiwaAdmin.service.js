import KaiwaDialogue from "../models/KaiwaDialogue.js";
import KaiwaQuestion from "../models/KaiwaQuestion.js";
import { fail, objectId } from "./kaiwa.service.js";

const dialogueFields = ["textbook", "lesson", "title", "description", "level", "source", "speakers", "lines"];
const questionFields = [
  "textbook", "lesson", "source", "dialogueId", "sourceLineId", "question",
  "suggestedAnswers", "grammarTags", "vocabularyTags", "difficulty", "explanation",
  "order", "audioUrl", "isActive",
];

export function validateKaiwaContent(model, data) {
  const fields = model === KaiwaDialogue ? dialogueFields : questionFields;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      Object.keys(data).some((key) => !fields.includes(key))) {
    fail(400, "Expected a JSON object containing only Kaiwa content fields");
  }
  if (Object.hasOwn(data, "lesson") && (!Number.isSafeInteger(data.lesson) || data.lesson < 1)) {
    fail(400, "Lesson must be a positive integer");
  }
  if (Object.hasOwn(data, "isActive") && typeof data.isActive !== "boolean") {
    fail(400, "isActive must be boolean");
  }
  if (data.dialogueId != null) objectId(data.dialogueId);
  for (const key of ["speakers", "lines", "suggestedAnswers", "grammarTags", "vocabularyTags"]) {
    if (Object.hasOwn(data, key) && !Array.isArray(data[key])) fail(400, "Expected an array for " + key);
  }
  return data;
}

export async function createKaiwaContent(model, data) {
  const validated = validateKaiwaContent(model, data);
  await model.init();
  return model.create(validated);
}
