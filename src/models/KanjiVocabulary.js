
import mongoose from "mongoose";

const { Schema } = mongoose;

// Phân đoạn Furigana
const FuriganaSegmentSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    furigana: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

// Cách đọc của từ
const ReadingSchema = new Schema(
  {
    reading: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["onyomi", "kunyomi", "mixed", "special", "other"],
      default: "other",
    },

    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Ví dụ
const ExampleSchema = new Schema(
  {
    jp: {
      type: String,
      required: true,
    },

    hiragana: {
      type: String,
      default: "",
    },

    vi: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const KanjiVocabularySchema = new Schema(
  {
    // Từ vựng: 生活, 申し込む, 生きる...
    word: {
      type: String,
      required: true,
      trim: true,
    },

    // Cách đọc Hiragana
    hiragana: {
      type: String,
      required: true,
      trim: true,
    },

    katakana: {
      type: String,
      default: "",
      trim: true,
    },

    romaji: {
      type: String,
      default: "",
      trim: true,
    },

    // Liên kết các Kanji xuất hiện trong từ
    kanjiIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Kanji",
      },
    ],

    // Dữ liệu hiển thị Furigana
    segments: {
      type: [FuriganaSegmentSchema],
      default: [],
    },

    // Cách đọc On/Kun hoặc cách đọc đặc biệt
    readings: {
      type: [ReadingSchema],
      default: [],
    },

    // Nghĩa tiếng Việt
    meaning: {
      type: String,
      required: true,
      trim: true,
    },

    // Hán Việt
    hanViet: {
      type: String,
      default: "",
      trim: true,
    },

    partOfSpeech: {
      type: [
        {
          type: String,
          enum: [
            "noun",
            "verb_g_1",
            "verb_g_2",
            "verb_g_3",
            "adj_i",
            "adj_na",
            "adverb",
            "conjunction",
            "pronoun",
            "interjection",
            "expression",
            "counter",
            "prefix",
            "suffix",
            "particle",
          ],
        },
      ],
      default: [],
    },

    // Trình độ JLPT
    jlpt: {
      type: [
        {
          type: String,
          enum: ["N5", "N4", "N3", "N2", "N1"],
        },
      ],
      default: [],
    },

    // Phân loại: từ ghép hoặc từ đơn
    wordType: {
      type: String,
      enum: ["compound", "standalone", "other"],
      default: "compound",
    },

    // Chủ đề
    topic: {
      type: String,
      default: "",
      trim: true,
    },

    examples: {
      type: [ExampleSchema],
      default: [],
    },

    notes: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    audio: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Tìm từ vựng theo Kanji
KanjiVocabularySchema.index({ kanjiIds: 1 });

// Tìm kiếm từ vựng
KanjiVocabularySchema.index({ word: 1 });
KanjiVocabularySchema.index({ hiragana: 1 });

// Lọc dữ liệu
KanjiVocabularySchema.index({ jlpt: 1 });
KanjiVocabularySchema.index({ topic: 1 });
KanjiVocabularySchema.index({ wordType: 1 });

const KanjiVocabulary = mongoose.model(
  "KanjiVocabulary",
  KanjiVocabularySchema
);

export default KanjiVocabulary;
