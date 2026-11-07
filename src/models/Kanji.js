
import mongoose from "mongoose";

const { Schema } = mongoose;

// Âm đọc On / Kun
const ReadingSchema = new Schema(
  {
    reading: {
      type: String,
      required: true,
      trim: true,
    },

    romaji: {
      type: String,
      default: "",
      trim: true,
    },

    // Ví dụ: きる trong 生きる
    okurigana: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const KanjiSchema = new Schema(
  {
    // Chữ Kanji
    kanji: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Âm On
    onyomi: {
      type: [ReadingSchema],
      default: [],
    },

    // Âm Kun
    kunyomi: {
      type: [ReadingSchema],
      default: [],
    },

    // Bộ thủ
    radicalId: {
      type: Schema.Types.ObjectId,
      ref: "Radical",
      default: null,
    },

    // Các thành phần cấu tạo Kanji
    components: {
      type: [String],
      default: [],
    },

    // Hán Việt
    hanViet: {
      type: [String],
      default: [],
    },

    // Nghĩa tiếng Việt
    meanings: {
      type: [String],
      default: [],
    },

    // Cách ghi nhớ Kanji
    mnemonic: {
      type: String,
      default: "",
    },

    // Số nét
    strokes: {
      type: Number,
      default: 0,
      min: 0,
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

    // Độ phổ biến
    frequency: {
      type: Number,
      default: null,
    },

    notes: {
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

KanjiSchema.index({ radicalId: 1 });
KanjiSchema.index({ jlpt: 1 });

const Kanji = mongoose.model("Kanji", KanjiSchema);

export default Kanji;
