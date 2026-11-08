import mongoose from "mongoose";

const { Schema } = mongoose;

const KanjiCurriculumEntrySchema = new Schema(
  {
    curriculum: {
      type: String,
      required: true,
      trim: true,
      default: "sou-matome-n3-kanji",
      index: true,
    },
    week: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    kanjiId: {
      type: Schema.Types.ObjectId,
      ref: "Kanji",
      default: null,
    },
    vocabularyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "KanjiVocabulary",
      },
    ],
  },
  {
    timestamps: true,
  }
);

KanjiCurriculumEntrySchema.index(
  { curriculum: 1, week: 1, day: 1 },
  { name: "curriculum_week_day_idx" }
);

KanjiCurriculumEntrySchema.index(
  { curriculum: 1, week: 1, day: 1, order: 1 },
  { unique: true, name: "curriculum_position_unique_idx" }
);

const KanjiCurriculumEntry = mongoose.model(
  "KanjiCurriculumEntry",
  KanjiCurriculumEntrySchema
);

export default KanjiCurriculumEntry;
