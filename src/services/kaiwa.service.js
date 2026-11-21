import { createHash, randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import KaiwaDialogue from "../models/KaiwaDialogue.js";
import KaiwaQuestion from "../models/KaiwaQuestion.js";
import KaiwaPracticeSession, { practiceSessionTtlSeconds } from "../models/KaiwaPracticeSession.js";
import { assessments, difficulties, levels, maxQuestions, sources, textbooks } from "../models/kaiwaFields.js";

export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function pickFields(input, fields) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Expected an object");
  if (Object.keys(input).some((key) => !fields.includes(key))) fail(400, "Unexpected field");
  return input;
}

function choice(value, options, field) {
  if (!options.includes(value)) fail(400, "Invalid " + field);
  return value;
}

function integer(value, field, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) value = Number(value);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) fail(400, "Invalid " + field);
  return value;
}

export function objectId(value) {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value)) fail(400, "Invalid ObjectId");
  return value;
}

function scope(input) {
  const filter = {};
  if (input.textbook !== undefined) filter.textbook = choice(input.textbook, textbooks, "textbook");
  if (input.lesson !== undefined) filter.lesson = integer(input.lesson, "lesson");
  return filter;
}

function questionSource(source) {
  return choice(source, [...sources, "all"], "source");
}

const questionFields = "textbook lesson source dialogueId sourceLineId question suggestedAnswers grammarTags vocabularyTags difficulty explanation order audioUrl";

export function listDialogues(input) {
  pickFields(input, ["textbook", "lesson", "level"]);
  const filter = scope(input);
  if (input.level !== undefined) filter.level = choice(input.level, levels, "level");
  return KaiwaDialogue.find(filter)
    .select("textbook lesson title description level source")
    .sort({ textbook: 1, lesson: 1 }).lean();
}

export async function getDialogue(id) {
  const dialogue = await KaiwaDialogue.findById(objectId(id)).select("-__v").lean();
  if (!dialogue) fail(404, "Dialogue not found");
  dialogue.lines.sort((a, b) => a.order - b.order);
  return dialogue;
}

function findQuestions(filter, source, limit) {
  if (source !== "all") filter.source = source;
  return KaiwaQuestion.find({ ...filter, isActive: true }).select(questionFields)
    .sort({ textbook: 1, lesson: 1, order: 1, source: 1, _id: 1 }).limit(limit).lean();
}

export function listQuestions(input) {
  pickFields(input, ["textbook", "lesson", "source", "difficulty", "limit"]);
  const filter = scope(input);
  if (input.difficulty !== undefined) filter.difficulty = choice(input.difficulty, difficulties, "difficulty");
  return findQuestions(filter, questionSource(input.source ?? "all"), integer(input.limit ?? maxQuestions, "limit", maxQuestions));
}

function keyHash(key) {
  return createHash("sha256").update(key).digest("hex");
}

function sessionData(session) {
  const {
    sessionId, textbook, lessons, questionIds, questions, currentIndex,
    answers, status, startedAt, completedAt,
  } = session;
  return { sessionId, textbook, lessons, questionIds, questions, currentIndex, answers, status, startedAt, completedAt };
}

export async function createSession(input) {
  pickFields(input, ["textbook", "lessons", "source", "limit"]);
  const textbook = choice(input.textbook, textbooks, "textbook");
  if (!Array.isArray(input.lessons) || input.lessons.length < 1 || input.lessons.length > 50) {
    fail(400, "Provide 1 to 50 lessons");
  }
  const lessons = [...new Set(input.lessons.map((lesson) => integer(lesson, "lesson")))];
  const source = questionSource(input.source === undefined ? "all" : input.source);
  const limit = integer(input.limit === undefined ? maxQuestions : input.limit, "limit", maxQuestions);
  const questions = await findQuestions({ textbook, lesson: { $in: lessons } }, source, limit);
  if (!questions.length) fail(404, "No active questions in the selected lessons");

  const accessToken = randomBytes(32).toString("hex");
  const session = await KaiwaPracticeSession.create({
    sessionId: randomUUID(), accessKeyHash: keyHash(accessToken), textbook, lessons,
    questions, questionIds: questions.map((question) => question._id),
  });
  return { ...sessionData(session), accessToken };
}

async function findSession(id, authorization) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) fail(400, "Invalid session ID");
  const token = /^Bearer ([0-9a-f]{64})$/i.exec(authorization ?? "")?.[1];
  if (!token) fail(401, "Session access token required");

  const cutoff = new Date(Date.now() - practiceSessionTtlSeconds * 1000);
  const session = await KaiwaPracticeSession.findOne({
    sessionId: id, accessKeyHash: keyHash(token), startedAt: { $gt: cutoff },
  });
  if (!session) fail(404, "Session not found");
  return session;
}

export async function getSession(id, authorization) {
  return sessionData(await findSession(id, authorization));
}

async function updateSession(id, authorization, apply) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const session = await findSession(id, authorization);
    if (!apply(session)) return sessionData(session);
    try {
      await session.save();
      return sessionData(session);
    } catch (error) {
      if (error.name === "DocumentNotFoundError") fail(404, "Session not found");
      if (error.name !== "VersionError") throw error;
    }
  }
  fail(409, "Session changed concurrently. Retry the request");
}

export function saveAnswer(id, authorization, input) {
  pickFields(input, ["questionId", "userAnswer", "selfAssessment"]);
  const questionId = objectId(input.questionId).toLowerCase();
  const selfAssessment = choice(input.selfAssessment, assessments, "selfAssessment");
  const userAnswer = input.userAnswer === undefined ? "" : input.userAnswer;
  if (typeof userAnswer !== "string" || userAnswer.length > 1000) fail(400, "Invalid userAnswer");

  return updateSession(id, authorization, (session) => {
    if (!session.questionIds.some((item) => String(item) === questionId)) {
      fail(400, "Question is outside this session");
    }
    const previous = session.answers.find((answer) => String(answer.questionId) === questionId);
    if (previous) {
      if (previous.selfAssessment === selfAssessment && previous.userAnswer === userAnswer) return false;
      fail(409, "An assessment already exists for this question");
    }
    if (session.status !== "in_progress") fail(409, "Session is already completed");
    session.answers.push({ questionId, userAnswer, selfAssessment, answeredAt: new Date() });
    const answered = new Set(session.answers.map((answer) => String(answer.questionId)));
    const nextIndex = session.questionIds.findIndex((item) => !answered.has(String(item)));
    session.currentIndex = nextIndex === -1 ? session.questionIds.length : nextIndex;
    return true;
  });
}

export function completeSession(id, authorization, input) {
  pickFields(input ?? {}, []);
  return updateSession(id, authorization, (session) => {
    if (session.status === "completed") return false;
    if (session.currentIndex !== session.questionIds.length) fail(409, "Assess every question before completing");
    session.status = "completed";
    session.completedAt = new Date();
    return true;
  });
}
