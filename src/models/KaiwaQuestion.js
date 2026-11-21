import mongoose from "mongoose";
import KaiwaDialogue from "./KaiwaDialogue.js";
import {
  audioUrl, boundedArray, difficulties, optionalText, positiveInteger,
  requiredText, sources, textbooks, uniqueField,
} from "./kaiwaFields.js";

const embedded = { _id: false, strict: "throw" };
const textFields = {
  jp: requiredText(1000),
  reading: optionalText(1000),
  vi: optionalText(1500),
};
const questionSchema = new mongoose.Schema(textFields, embedded);
const answerSchema = new mongoose.Schema({
  ...textFields,
  id: requiredText(64),
  explanation: optionalText(1500),
}, embedded);

const schema = new mongoose.Schema({
  textbook: { type: String, enum: textbooks, required: true },
  lesson: positiveInteger,
  source: { type: String, enum: sources, required: true },
  dialogueId: { type: mongoose.Schema.Types.ObjectId, ref: "KaiwaDialogue", default: null },
  sourceLineId: { ...optionalText(64), default: null },
  question: { type: questionSchema, required: true },
  suggestedAnswers: boundedArray([answerSchema], 0, 12),
  grammarTags: boundedArray([requiredText(80)], 0, 30),
  vocabularyTags: boundedArray([requiredText(80)], 0, 30),
  difficulty: { type: String, enum: difficulties, default: "easy", required: true },
  explanation: optionalText(1500),
  order: positiveInteger,
  audioUrl,
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true, strict: "throw" });

schema.pre("validate", async function () {
  if (this.isActive && !this.question?.vi) this.invalidate("question.vi", "Translation is required");
  if ((this.suggestedAnswers ?? []).some((answer) => !answer) || !uniqueField(this.suggestedAnswers ?? [], "id")) {
    this.invalidate("suggestedAnswers", "Invalid or duplicate answer ID");
  }
  if (this.source === "textbook" && (!this.dialogueId || !this.sourceLineId)) {
    this.invalidate("dialogueId", "Textbook questions require a dialogue and a line");
    return;
  }
  if (!this.dialogueId && !this.sourceLineId) return;
  const filter = { _id: this.dialogueId, textbook: this.textbook, lesson: this.lesson };
  if (this.source === "textbook") filter.source = "textbook";
  if (this.sourceLineId) {
    filter.lines = { $elemMatch: { id: this.sourceLineId } };
  }
  if (!this.dialogueId || !(await KaiwaDialogue.exists(filter))) {
    this.invalidate("dialogueId", "Dialogue or line does not match the question scope");
  }
});

schema.index({ textbook: 1, lesson: 1, source: 1, order: 1 });
schema.index({ dialogueId: 1 });
export default mongoose.model("KaiwaQuestion", schema);

