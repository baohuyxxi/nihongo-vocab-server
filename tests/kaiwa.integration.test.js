import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import express from "express";
import mongoose from "mongoose";
import registerRoutes from "../src/routes/index.js";
import KaiwaDialogue from "../src/models/KaiwaDialogue.js";
import KaiwaQuestion from "../src/models/KaiwaQuestion.js";
import KaiwaPracticeSession from "../src/models/KaiwaPracticeSession.js";

const runFile = promisify(execFile);
const enabled = process.env.KAIWA_TEST_LOCAL_MONGO === "1";

test("Kaiwa V1 HTTP and admin integration", { skip: !enabled }, async (t) => {
  const uri = "mongodb://127.0.0.1:27017/kaiwa_test_" + randomUUID().replaceAll("-", "");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  t.after(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });

  await Promise.all([KaiwaDialogue.init(), KaiwaQuestion.init(), KaiwaPracticeSession.init()]);
  assert.ok((await KaiwaDialogue.listIndexes()).some(({ key, unique }) =>
    key.textbook === 1 && key.lesson === 1 && unique));
  assert.ok((await KaiwaQuestion.listIndexes()).some(({ key }) =>
    key.textbook === 1 && key.lesson === 1 && key.source === 1 && key.order === 1));
  const sessionIndexes = await KaiwaPracticeSession.listIndexes();
  const ttl = sessionIndexes.find(({ key }) => key.startedAt === 1).expireAfterSeconds;
  assert.equal(ttl, 2_592_000);
  assert.ok(sessionIndexes.some(({ key, unique }) =>
    key.sessionId === 1 && unique));

  async function withServerProcess(port, run) {
    const child = spawn(process.execPath, ["src/server.js"], {
      env: { ...process.env, MONGO_URI: uri, PORT: String(port) },
    });
    const exited = new Promise((resolve) => child.once("close", resolve));
    let output = "";
    let errors = "";
    child.stderr.on("data", (chunk) => { errors += chunk; });
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 8000);
        child.stdout.on("data", (chunk) => {
          output += chunk;
          if (output.includes("Server running") && output.includes("MongoDB connected")) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.once("exit", (code) => {
          clearTimeout(timeout);
          reject(new Error("Server exited during startup with code " + code));
        });
      });
      await run();
    } finally {
      child.kill();
      await exited;
    }
    return output + errors;
  }

  await withServerProcess(0, async () => {});

  const app = express();
  app.use(express.json());
  registerRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve, reject) => server.once("listening", resolve).once("error", reject));

  const base = "http://127.0.0.1:" + server.address().port;
  async function request(path, status, { method = "GET", body, token, adminKey } = {}) {
    const headers = token ? { Authorization: "Bearer " + token } : {};
    if (adminKey !== undefined) headers["x-admin-key"] = adminKey;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(base + "/api/kaiwa" + path, {
      method, headers, body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const payload = await response.json();
    assert.equal(response.status, status, JSON.stringify(payload));
    assert.equal(payload.success, status < 400);
    if (path.startsWith("/practice-sessions") && status < 400) {
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(payload.data.accessKeyHash, undefined);
      if (response.status !== 201) assert.equal(payload.data.accessToken, undefined);
    }
    return payload.data;
  }

  assert.deepEqual(await request("/dialogues", 200), []);
  assert.deepEqual(await request("/questions?source=all", 200), []);
  assert.equal((await fetch(base + "/api/vocab", { method: "OPTIONS" })).status, 200);
  const legacyLessons = await fetch(base + "/api/lessons");
  assert.equal(legacyLessons.status, 200);
  assert.deepEqual(await legacyLessons.json(), []);
  await request("/questions?textbook=unknown", 400);
  await request("/questions?lesson=1.5", 400);
  await request("/questions?limit=51", 400);
  await request("/questions?source=other", 400);
  await request("/dialogues/not-an-id", 400);
  await request("/dialogues/" + new mongoose.Types.ObjectId(), 404);
  await request("/practice-sessions", 400, { method: "POST", body: "{" });
  await request("/practice-sessions", 404, {
    method: "POST", body: { textbook: "minna_2", lessons: [27] },
  });
  assert.equal(await KaiwaPracticeSession.countDocuments(), 0);

  const dialogue = {
    textbook: "minna_2", lesson: 27, source: "custom", title: "Custom test dialogue",
    speakers: [{ id: "speaker_1", name: "A" }],
    lines: [
      { id: "line_2", order: 2, speakerId: "speaker_1", jp: "はい。" },
      { id: "line_1", order: 1, speakerId: "speaker_1", jp: "明日は休みです。公園へ行きますか。" },
    ],
  };
  const fixture = await KaiwaDialogue.create(dialogue);
  await assert.rejects(KaiwaDialogue.create(dialogue), { code: 11000 });
  await assert.rejects(new KaiwaDialogue({
    ...dialogue, lines: [{ ...dialogue.lines[0], speakerId: "missing" }],
  }).validate(), { name: "ValidationError" });
  await assert.rejects(new KaiwaDialogue({
    ...dialogue, lines: [dialogue.lines[0], dialogue.lines[0]],
  }).validate(), { name: "ValidationError" });
  const [summary] = await request("/dialogues?textbook=minna_2&lesson=27", 200);
  assert.equal(summary._id, String(fixture._id));
  assert.equal(summary.lines, undefined);
  const detail = await request("/dialogues/" + fixture._id, 200);
  assert.deepEqual(detail.lines.map(({ id }) => id), ["line_1", "line_2"]);
  assert.equal(detail.lines[0].jp, dialogue.lines[1].jp);

  for (const [method, path] of [
    ["POST", "/dialogues"], ["PATCH", "/dialogues/" + fixture._id],
    ["DELETE", "/dialogues/" + fixture._id], ["POST", "/questions"],
  ]) {
    assert.equal((await fetch(base + "/api/kaiwa" + path, { method })).status, 404);
  }
  assert.equal(await KaiwaDialogue.countDocuments(), 1);

  const question = {
    textbook: "minna_2", lesson: 27, source: "custom", order: 2,
    dialogueId: String(fixture._id), sourceLineId: "line_1",
    question: { jp: "休みの日に何をしますか。", vi: "Bạn làm gì vào ngày nghỉ?" },
    suggestedAnswers: [
      { id: "answer_1", jp: "公園へ行きます。", vi: "Tôi đi công viên." },
      { id: "answer_2", jp: "家で本を読みます。", vi: "Tôi đọc sách ở nhà." },
    ],
  };
  await assert.rejects(new KaiwaQuestion({ ...question, source: "textbook" }).validate(), { name: "ValidationError" });
  await assert.rejects(new KaiwaQuestion({ ...question, sourceLineId: "missing" }).validate(), { name: "ValidationError" });
  await assert.rejects(new KaiwaQuestion({ ...question, lesson: 28 }).validate(), { name: "ValidationError" });
  await assert.rejects(new KaiwaQuestion({ ...question, question: { jp: "休みですか。" } }).validate(), { name: "ValidationError" });
  const first = await KaiwaQuestion.create({ ...question, order: 1 });
  const second = await KaiwaQuestion.create(question);
  const outside = await KaiwaQuestion.create({ ...question, lesson: 28, dialogueId: null, sourceLineId: null });
  await KaiwaQuestion.create({ ...question, isActive: false });

  assert.deepEqual(await request("/questions?source=textbook", 200), []);
  for (const source of ["custom", "all"]) {
    const questions = await request("/questions?lesson=27&source=" + source, 200);
    assert.deepEqual(questions.map(({ _id }) => _id), [String(first._id), String(second._id)]);
    assert.deepEqual(questions[0].suggestedAnswers.map(({ id }) => id), ["answer_1", "answer_2"]);
  }

  const session = await request("/practice-sessions", 201, {
    method: "POST", body: { textbook: "minna_2", lessons: [27, 27], source: "all" },
  });
  const path = "/practice-sessions/" + session.sessionId;
  const token = session.accessToken;
  assert.match(token, /^[0-9a-f]{64}$/);
  const stored = await KaiwaPracticeSession.collection.findOne({ sessionId: session.sessionId });
  assert.equal(stored.accessKeyHash, createHash("sha256").update(token).digest("hex"));
  assert.equal(JSON.stringify(stored).includes(token), false);
  assert.deepEqual(session.lessons, [27]);
  assert.deepEqual(session.questionIds, [String(first._id), String(second._id)]);
  assert.equal(session.accessKeyHash, undefined);
  await request(path, 401);
  await request(path, 404, { token: "0".repeat(64) });
  assert.equal((await request(path, 200, { token })).accessToken, undefined);
  await request(path + "/complete", 409, { method: "POST", token });

  const patch = (body, status = 200) => request(path, status, { method: "PATCH", token, body });
  await patch({ questionId: String(outside._id), selfAssessment: "known" }, 400);
  await patch({ questionId: String(first._id), selfAssessment: "known", status: "completed" }, 400);

  const answer = { questionId: String(first._id), userAnswer: "散歩します。", selfAssessment: "known" };
  const retry = { questionId: String(second._id), selfAssessment: "retry" };
  const other = await request("/practice-sessions", 201, {
    method: "POST", body: { textbook: "minna_2", lessons: [27] },
  });
  assert.notEqual(other.accessToken, token);
  for (const [target, method, body] of [
    [path, "GET"], [path, "PATCH", answer], [path + "/complete", "POST"],
  ]) {
    await request(target, 401, { method, body });
    await request(target, 404, { method, body, token: other.accessToken });
  }
  await request(path + "?accessToken=" + token, 401);

  await patch(retry);
  assert.equal((await request(path, 200, { token })).currentIndex, 0);
  await Promise.all([patch(answer), patch(answer), patch(retry)]);
  await patch(answer);
  const resumed = await request(path, 200, { token });
  assert.equal(resumed.answers.length, 2);
  assert.equal(resumed.currentIndex, 2);
  assert.equal(resumed.answers.find(({ questionId }) => questionId === answer.questionId).userAnswer, answer.userAnswer);
  assert.ok(resumed.answers.some(({ selfAssessment }) => selfAssessment === "retry"));
  await patch({ ...answer, selfAssessment: "retry" }, 409);
  const complete = () => request(path + "/complete", 200, { method: "POST", token });
  assert.deepEqual((await request(path, 200, { token })).answers, resumed.answers);
  const [completed, alsoCompleted] = await Promise.all([complete(), complete()]);
  assert.equal(alsoCompleted.completedAt, completed.completedAt);
  assert.equal(completed.status, "completed");
  assert.equal((await complete()).completedAt, completed.completedAt);

  await KaiwaQuestion.updateOne({ _id: first._id }, { $set: { order: 99, "question.vi": "Updated source" } });
  const changedBank = await request("/questions?lesson=27&source=custom", 200);
  assert.equal(changedBank.at(-1).question.vi, "Updated source");
  const afterEdit = await request(path, 200, { token });
  assert.deepEqual(afterEdit.questions, session.questions);
  assert.deepEqual(afterEdit.questionIds, session.questionIds);

  await KaiwaPracticeSession.updateOne(
    { sessionId: other.sessionId }, { $set: { startedAt: new Date(Date.now() - ttl * 1000 - 1000) } },
  );
  const expiredPath = "/practice-sessions/" + other.sessionId;
  await request(expiredPath, 404, { token: other.accessToken });
  await request(expiredPath, 404, { method: "PATCH", body: answer, token: other.accessToken });
  await request(expiredPath + "/complete", 404, { method: "POST", token: other.accessToken });

  const directory = await mkdtemp(join(tmpdir(), "kaiwa-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "question.json");
  const admin = async (...args) => {
    const { stdout } = await runFile(process.execPath, ["src/scripts/kaiwaAdmin.js", ...args], {
      env: { ...process.env, KAIWA_ADMIN_MONGO_URI: uri },
    });
    return JSON.parse(stdout);
  };
  await writeFile(file, JSON.stringify(question));
  const created = await admin("questions", "create", file);
  assert.ok((await admin("questions", "list")).some(({ _id }) => _id === created._id));
  const importedId = String(new mongoose.Types.ObjectId());
  assert.equal((await admin("questions", "import", importedId, file))._id, importedId);
  assert.equal((await admin("questions", "import", importedId, file)).skipped, true);
  assert.equal((await admin("questions", "get", importedId)).source, "custom");
  await writeFile(file, JSON.stringify({ isActive: false }));
  assert.equal((await admin("questions", "update", importedId, file)).isActive, false);
  await assert.rejects(admin("dialogues", "delete", String(fixture._id)), /invalidate/);
  assert.equal((await admin("questions", "delete", String(first._id))).deleted, true);
  assert.equal((await request(path, 200, { token })).questions[0]._id, String(first._id));

  const pending = await request("/practice-sessions", 201, {
    method: "POST", body: { textbook: "minna_2", lessons: [27], limit: 2 },
  });
  const pendingPath = "/practice-sessions/" + pending.sessionId;
  const pendingQuestionId = pending.questionIds[0];
  const race = await Promise.all(["known", "retry"].map(async (selfAssessment) => {
    const response = await fetch(base + "/api/kaiwa" + pendingPath, {
      method: "PATCH",
      headers: { Authorization: "Bearer " + pending.accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: pendingQuestionId, selfAssessment }),
    });
    return response.status;
  }));
  assert.deepEqual(race.sort(), [200, 409]);
  const beforeRestart = await request(pendingPath, 200, { token: pending.accessToken });
  assert.equal(beforeRestart.status, "in_progress");
  assert.equal(beforeRestart.answers.length, 1);
  assert.equal(beforeRestart.currentIndex, 1);

  await t.test("admin POST requires a configured admin key and validates content", async () => {
    const originalKey = process.env.ADMIN_API_KEY;
    const adminKey = randomUUID();
    const dialoguePath = "/admin/dialogues";
    const questionPath = "/admin/questions";
    const dialogueBody = { ...dialogue, lesson: 34 };
    const questionBody = { ...question, lesson: 34, dialogueId: null, sourceLineId: null };
    const post = (path, status, body, credentials = {}) =>
      request(path, status, { method: "POST", body, ...credentials });

    try {
      delete process.env.ADMIN_API_KEY;
      await post(dialoguePath, 403, dialogueBody, { adminKey });
      await post(questionPath, 403, questionBody, { adminKey });
      process.env.ADMIN_API_KEY = adminKey;
      for (const [path, body] of [[dialoguePath, dialogueBody], [questionPath, questionBody]]) {
        await post(path, 403, body);
        await post(path, 403, body, { adminKey: "wrong" });
        await post(path, 403, body, { token: pending.accessToken });
        await post(path, 400, "{", { adminKey });
      }
      assert.equal(await KaiwaDialogue.countDocuments({ lesson: 34 }), 0);
      assert.equal(await KaiwaQuestion.countDocuments({ lesson: 34 }), 0);

      await post(dialoguePath, 400, { ...dialogueBody, lesson: "34" }, { adminKey });
      const createdDialogue = await post(dialoguePath, 201, dialogueBody, { adminKey });
      assert.equal(createdDialogue.lesson, 34);
      await post(dialoguePath, 409, dialogueBody, { adminKey });
      const linkedQuestion = { ...questionBody, dialogueId: createdDialogue._id };
      await post(questionPath, 400, { ...linkedQuestion, sourceLineId: "missing" }, { adminKey });
      const createdQuestion = await post(questionPath, 201, {
        ...linkedQuestion, sourceLineId: "line_1",
      }, { adminKey });
      assert.equal(createdQuestion.source, "custom");
      assert.equal(createdQuestion.dialogueId, createdDialogue._id);
      assert.equal(await KaiwaDialogue.countDocuments({ lesson: 34 }), 1);
      assert.equal(await KaiwaQuestion.countDocuments({ lesson: 34 }), 1);
    } finally {
      if (originalKey === undefined) delete process.env.ADMIN_API_KEY;
      else process.env.ADMIN_API_KEY = originalKey;
    }
  });

  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const serverLog = await withServerProcess(port, async () => {
    assert.deepEqual(await request(path, 200, { token }), completed);
    assert.deepEqual(await request(pendingPath, 200, { token: pending.accessToken }), beforeRestart);
  });
  assert.equal(serverLog.includes(token), false);
  assert.equal(serverLog.includes(pending.accessToken), false);

  const deadline = Date.now() + 75_000;
  while (await KaiwaPracticeSession.exists({ sessionId: other.sessionId })) {
    assert.ok(Date.now() < deadline, "MongoDB TTL monitor did not remove the expired session");
    await delay(1000);
  }
  assert.ok(await KaiwaPracticeSession.exists({ sessionId: session.sessionId }));
});
