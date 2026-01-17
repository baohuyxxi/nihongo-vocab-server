import connectDB from "../config/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";
const lesson4Vocabs = [
  // ===== ĐỘNG TỪ =====
  { lesson: 4, hiragana: "おきます", meaning: "thức dậy", partOfSpeech: "verb" },
  {
    lesson: 4,
    hiragana: "ねます",
    kanji: "寝ます",
    meaning: "ngủ",
    partOfSpeech: "verb",
  },
  {
    lesson: 4,
    hiragana: "はたらきます",
    kanji: "働きます",
    meaning: "làm việc",
    partOfSpeech: "verb",
  },
  {
    lesson: 4,
    hiragana: "やすみます",
    kanji: "休みます",
    meaning: "nghỉ ngơi",
    partOfSpeech: "verb",
  },
  {
    lesson: 4,
    hiragana: "べんきょうします",
    kanji: "勉強します",
    meaning: "học tập",
    partOfSpeech: "verb",
  },
  {
    lesson: 4,
    hiragana: "おわります",
    kanji: "終わります",
    meaning: "kết thúc",
    partOfSpeech: "verb",
  },

  // ===== ĐỊA ĐIỂM =====
  {
    lesson: 4,
    katakana: "デパート",
    defaultScript: "katakana",
    meaning: "cửa hàng bách hóa",
  },
  {
    lesson: 4,
    hiragana: "ぎんこう",
    kanji: "銀行",
    meaning: "ngân hàng",
  },
  {
    lesson: 4,
    hiragana: "ゆうびんきょく",
    kanji: "郵便局",
    meaning: "bưu điện",
  },
  {
    lesson: 4,
    hiragana: "としょかん",
    kanji: "図書館",
    meaning: "thư viện",
  },
  {
    lesson: 4,
    hiragana: "びじゅつかん",
    kanji: "美術館",
    meaning: "viện bảo tàng",
  },

  // ===== THÔNG TIN / THỜI GIAN =====
  {
    lesson: 4,
    hiragana: "でんわばんごう",
    kanji: "電話番号",
    meaning: "số điện thoại",
  },
  {
    lesson: 4,
    hiragana: "なんばん",
    kanji: "何番",
    meaning: "số mấy",
  },
  {
    lesson: 4,
    hiragana: "いま",
    kanji: "今",
    meaning: "bây giờ",
  },

  {
    lesson: 4,
    hiragana: "じ",
    kanji: "時",
    meaning: "giờ",
    partOfSpeech: "counter",
  },
  {
    lesson: 4,
    hiragana: "ふん",
    kanji: "分",
    meaning: "phút",
    partOfSpeech: "counter",
  },
  {
    lesson: 4,
    hiragana: "はん",
    kanji: "半",
    meaning: "phân nửa",
  },
  {
    lesson: 4,
    hiragana: "なんじ",
    kanji: "何時",
    meaning: "mấy giờ",
  },
  {
    lesson: 4,
    hiragana: "なんぷん",
    kanji: "何分",
    meaning: "mấy phút",
  },

  {
    lesson: 4,
    hiragana: "ごぜん",
    kanji: "午前",
    meaning: "sáng (AM)",
  },
  {
    lesson: 4,
    hiragana: "ごご",
    kanji: "午後",
    meaning: "chiều (PM)",
  },
  {
    lesson: 4,
    hiragana: "あさ",
    kanji: "朝",
    meaning: "sáng",
  },
  {
    lesson: 4,
    hiragana: "ひる",
    kanji: "昼",
    meaning: "trưa",
  },
  {
    lesson: 4,
    hiragana: "ばん",
    kanji: "晩",
    meaning: "tối",
  },
  {
    lesson: 4,
    hiragana: "よる",
    kanji: "夜",
    meaning: "tối",
  },

  // ===== NGÀY THÁNG =====
  { lesson: 4, hiragana: "おととい", meaning: "ngày hôm kia" },
  { lesson: 4, hiragana: "きのう", meaning: "ngày hôm qua" },
  {
    lesson: 4,
    hiragana: "きょう",
    kanji: "今日",
    meaning: "hôm nay",
  },
  {
    lesson: 4,
    hiragana: "あした",
    kanji: "明日",
    meaning: "ngày mai",
  },
  { lesson: 4, hiragana: "あさって", meaning: "ngày mốt" },
  {
    lesson: 4,
    hiragana: "けさ",
    kanji: "今朝",
    meaning: "sáng nay",
  },
  { lesson: 4, hiragana: "こんばん", meaning: "tối nay" },
  { lesson: 4, hiragana: "ゆうべ", meaning: "tối hôm qua" },

  // ===== DANH TỪ =====
  {
    lesson: 4,
    hiragana: "やすみ",
    kanji: "休み",
    meaning: "nghỉ ngơi (danh từ)",
  },
  {
    lesson: 4,
    hiragana: "ひるやすみ",
    kanji: "昼休み",
    meaning: "nghỉ trưa",
  },
  {
    lesson: 4,
    hiragana: "まいあさ",
    kanji: "毎朝",
    meaning: "mỗi sáng",
  },
  {
    lesson: 4,
    hiragana: "まいばん",
    kanji: "毎晩",
    meaning: "mỗi tối",
  },
  {
    lesson: 4,
    hiragana: "まいにち",
    kanji: "毎日",
    meaning: "mỗi ngày",
  },

  // ===== ĐỊA DANH =====
  {
    lesson: 4,
    katakana: "ペキン",
    defaultScript: "katakana",
    meaning: "Bắc Kinh",
  },
  {
    lesson: 4,
    katakana: "バンコク",
    defaultScript: "katakana",
    meaning: "Bangkok",
  },
  {
    lesson: 4,
    katakana: "ロンドン",
    defaultScript: "katakana",
    meaning: "Luân Đôn",
  },
  {
    lesson: 4,
    katakana: "ロサンゼルス",
    defaultScript: "katakana",
    meaning: "Los Angeles",
  },

  // ===== MẪU CÂU =====
  {
    lesson: 4,
    hiragana: "たいへんですね",
    kanji: "大変ですね",
    meaning: "vất vả nhỉ",
    partOfSpeech: "expression",
  },
  {
    lesson: 4,
    hiragana: "ばんごうあんない",
    meaning: "dịch vụ 116 (hỏi số điện thoại)",
  },
  {
    lesson: 4,
    hiragana: "おといあわせ",
    meaning: "(số điện thoại) bạn muốn hỏi",
  },
];

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    await Vocabulary.insertMany(lesson4Vocabs);
    console.log("✅ Seed lesson 3 success");

    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });