import mongoose from "mongoose";

const { Schema } = mongoose;

const ItemSelectionSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: ["kanji", "vocabulary"],
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }
);

const KanjiReviewHistorySchema = new Schema(
  {
    sessionKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    curriculum: {
      type: String,
      required: true,
      trim: true,
      default: "sou-matome-n3-kanji",
    },
    weeks: {
      type: [Number],
      default: [],
    },
    days: {
      type: [Number],
      default: [],
    },
    contentType: {
      type: String,
      enum: ["kanji", "vocabulary", "both"],
      default: "both",
    },
    mode: {
      type: String,
      enum: ["flashcard", "quiz", "typing"],
      default: "flashcard",
    },
    directions: {
      type: [String],
      default: [],
    },
    limit: {
      type: Number,
      default: 20,
      min: 1,
    },
    selectedIds: {
      type: [ItemSelectionSchema],
      default: [],
    },
    completedIds: {
      type: [ItemSelectionSchema],
      default: [],
    },
    remainingIds: {
      type: [ItemSelectionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "completed", "expired"],
      default: "active",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  },
  {
    timestamps: true,
  }
);

KanjiReviewHistorySchema.index({ curriculum: 1, status: 1, updatedAt: 1 });
KanjiReviewHistorySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const KanjiReviewHistory = mongoose.model(
  "KanjiReviewHistory",
  KanjiReviewHistorySchema
);

export default KanjiReviewHistory;
