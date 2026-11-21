import mongoose from "mongoose";
import { assessments, boundedArray, maxQuestions, positiveInteger, textbooks } from "./kaiwaFields.js";

export const practiceSessionTtlSeconds = 30 * 24 * 60 * 60;

const objectId = mongoose.Schema.Types.ObjectId;
const answerSchema = new mongoose.Schema({
  questionId: { type: objectId, required: true },
  userAnswer: { type: String, maxlength: 1000, default: "" },
  selfAssessment: { type: String, enum: assessments, required: true },
  answeredAt: { type: Date, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  accessKeyHash: { type: String, required: true, select: false },
  ownerId: { type: objectId, default: null },
  textbook: { type: String, enum: textbooks, required: true },
  lessons: boundedArray([positiveInteger], 1, 50),
  questionIds: boundedArray([{ type: objectId, ref: "KaiwaQuestion" }], 1, maxQuestions),
  questions: boundedArray([mongoose.Schema.Types.Mixed], 1, maxQuestions),
  currentIndex: { type: Number, default: 0, min: 0, max: maxQuestions },
  answers: boundedArray([answerSchema], 0, maxQuestions),
  status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { optimisticConcurrency: true });

schema.index({ startedAt: 1 }, { expireAfterSeconds: practiceSessionTtlSeconds });
export default mongoose.model("KaiwaPracticeSession", schema);
