import mongoose from "mongoose";

const vocabSchema = new mongoose.Schema(
    {
        // Bài Minna
        lesson: { type: Number }, // optional

        topic: { type: String },

        // Chữ viết
        kanji: { type: String },
        hiragana: { type: String },
        katakana: { type: String },

        // Chữ hiển thị mặc định
        defaultScript: {
            type: String,
            enum: ["hiragana", "katakana"],
            default: "hiragana",
        },

        // Romaji
        romaji: { type: String },

        phoneticVi: { type: String },

        // Nghĩa tiếng Việt
        meaning: { type: String, required: true },

        // ⭐ ÂM HÁN – HÁN VIỆT
        hanViet: { type: String }, // 人 → nhân

        // Loại từ
        partOfSpeech: { type: String },

        // Ví dụ
        example: {
            jp: String,
            vi: String,
        },

        // Audio
        audio: { type: String },
        english: { type: String },
        image: {
            url: String,
            public_id: String,
        },

        video: {
            url: String,
            public_id: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Vocabulary", vocabSchema);
