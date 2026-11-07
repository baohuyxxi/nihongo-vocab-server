
import mongoose from "mongoose";

const { Schema } = mongoose;

const RadicalSchema = new Schema(
  {
    // Chữ bộ thủ: 糸, 水, 木...
    character: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Tên bộ: 糸部...
    name: {
      type: String,
      default: "",
      trim: true,
    },

    // Hán Việt: MỊCH, THỦY, MỘC...
    hanViet: {
      type: String,
      default: "",
      trim: true,
    },

    meanings: {
      type: [String],
      default: [],
    },

    // Số nét
    strokes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Các dạng biến thể: 糹...
    variants: {
      type: [String],
      default: [],
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

const Radical = mongoose.model("Radical", RadicalSchema);

export default Radical;
