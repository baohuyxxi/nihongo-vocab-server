import mongoose from "mongoose";
import {
  audioUrl, boundedArray, levels, optionalText, positiveInteger, requiredText,
  sources, textbooks, uniqueField,
} from "./kaiwaFields.js";

const embedded = { _id: false, strict: "throw" };
const speakerSchema = new mongoose.Schema({
  id: requiredText(64),
  name: requiredText(100),
  voiceId: {
    type: Number, default: null,
    validate: (value) => value == null || (Number.isSafeInteger(value) && value >= 0),
  },
}, embedded);

const lineSchema = new mongoose.Schema({
  id: requiredText(64),
  order: positiveInteger,
  speakerId: requiredText(64),
  jp: requiredText(1000),
  reading: optionalText(1000),
  vi: optionalText(1500),
  audioUrl,
}, embedded);

const schema = new mongoose.Schema({
  textbook: { type: String, enum: textbooks, required: true },
  lesson: positiveInteger,
  title: requiredText(200),
  description: optionalText(1500),
  level: { type: String, enum: levels },
  source: { type: String, enum: sources, default: "textbook", required: true },
  speakers: boundedArray([speakerSchema], 1, 30),
  lines: boundedArray([lineSchema], 1, 200),
}, { timestamps: true, strict: "throw" });

schema.pre("validate", function () {
  if (!this.speakers || !this.lines) return;
  if (!uniqueField(this.speakers, "id")) this.invalidate("speakers", "Duplicate speaker ID");
  if (!uniqueField(this.lines, "id") || !uniqueField(this.lines, "order")) {
    this.invalidate("lines", "Duplicate line ID or order");
  }
  const speakerIds = new Set(this.speakers.map((speaker) => speaker?.id));
  if (this.lines.some((line) => !line || !speakerIds.has(line.speakerId))) {
    this.invalidate("lines", "Unknown speaker ID");
  }
  if (this.speakers.some((speaker) => !speaker)) this.invalidate("speakers", "Invalid speaker");
});

schema.index({ textbook: 1, lesson: 1 }, { unique: true });
export default mongoose.model("KaiwaDialogue", schema);

