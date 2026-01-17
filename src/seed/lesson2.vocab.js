import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";
import connectDB from "../config/db.js";

dotenv.config();

const vocabLesson2 = [
  { lesson: 2, hiragana: "これ", meaning: "cái này, đây" },
  { lesson: 2, hiragana: "それ", meaning: "cái đó" },
  { lesson: 2, hiragana: "あれ", meaning: "cái kia" },
  { lesson: 2, hiragana: "この", meaning: "~ này" },
  { lesson: 2, hiragana: "その", meaning: "~ đó" },
  { lesson: 2, hiragana: "あの", meaning: "~ kia" },

  { lesson: 2, hiragana: "ほん", kanji: "本", meaning: "sách", hanViet: "bản" },
  { lesson: 2, hiragana: "じしょ", kanji: "辞書", meaning: "từ điển", hanViet: "từ thư" },
  { lesson: 2, hiragana: "ざっし", kanji: "雑誌", meaning: "tạp chí", hanViet: "tạp chí" },
  { lesson: 2, hiragana: "しんぶん", kanji: "新聞", meaning: "báo", hanViet: "tân văn" },

  { lesson: 2, katakana: "ノート", meaning: "vở" },
  { lesson: 2, hiragana: "てちょう", kanji: "手帳", meaning: "sổ tay", hanViet: "thủ trướng" },
  { lesson: 2, hiragana: "めいし", kanji: "名詞", meaning: "danh thiếp", hanViet: "danh từ" },

  { lesson: 2, katakana: "カード", meaning: "thẻ" },
  { lesson: 2, katakana: "テレホンカード", meaning: "thẻ điện thoại" },

  { lesson: 2, hiragana: "えんぴつ", kanji: "鉛筆", meaning: "bút chì", hanViet: "diên bút" },
  { lesson: 2, katakana: "ボールペン", meaning: "bút bi" },
  { lesson: 2, katakana: "シャープペンシル", meaning: "bút chì kim" },

  { lesson: 2, hiragana: "かぎ", meaning: "chìa khóa" },
  { lesson: 2, hiragana: "とけい", kanji: "時計", meaning: "đồng hồ", hanViet: "thời kế" },
  { lesson: 2, hiragana: "かさ", kanji: "傘", meaning: "ô, dù", hanViet: "tán" },

  { lesson: 2, hiragana: "かばん", meaning: "cặp, túi" },
  { lesson: 2, katakana: "テープ", meaning: "băng cassette" },
  { lesson: 2, katakana: "テープレコーダー", meaning: "máy ghi âm" },

  { lesson: 2, katakana: "テレビ", meaning: "tivi" },
  { lesson: 2, katakana: "ラジオ", meaning: "radio" },
  { lesson: 2, katakana: "カメラ", meaning: "máy ảnh" },
  { lesson: 2, katakana: "コンピュータ", meaning: "máy tính" },

  { lesson: 2, hiragana: "じどうしゃ", kanji: "自動車", meaning: "ô tô", hanViet: "tự động xa" },
  { lesson: 2, hiragana: "つくえ", kanji: "机", meaning: "bàn", hanViet: "kỷ" },
  { lesson: 2, hiragana: "いす", meaning: "ghế" },

  { lesson: 2, katakana: "チョコレート", meaning: "sô-cô-la" },
  { lesson: 2, katakana: "コーヒー", meaning: "cà phê" },

  { lesson: 2, hiragana: "えいご", kanji: "英語", meaning: "tiếng Anh", hanViet: "anh ngữ" },
  { lesson: 2, hiragana: "にほんご", kanji: "日本語", meaning: "tiếng Nhật", hanViet: "nhật bản ngữ" },
  { lesson: 2, hiragana: "～ご", kanji: "～語", meaning: "tiếng ~", hanViet: "ngữ" },

  { lesson: 2, hiragana: "なん", kanji: "何", meaning: "cái gì", hanViet: "hà" },
  { lesson: 2, hiragana: "そう", meaning: "đúng vậy" },
  { lesson: 2, hiragana: "ちがいます", kanji: "違います", meaning: "không đúng" },
  { lesson: 2, hiragana: "そうですか", meaning: "thế à?" },

  { lesson: 2, hiragana: "あのう", meaning: "à… (do dự)" },
  {
    lesson: 2,
    hiragana: "ほんのきもちです",
    kanji: "ほんの気持ちです",
    meaning: "chút quà nhỏ của tôi",
    hanViet: "khí trì",
  },
  { lesson: 2, hiragana: "どうぞ", meaning: "xin mời" },
  { lesson: 2, hiragana: "どうも", meaning: "cảm ơn" },
  {
    lesson: 2,
    hiragana: "どうもありがとうございます",
    meaning: "cảm ơn rất nhiều",
  },
  {
    lesson: 2,
    hiragana: "これからおせわになります",
    kanji: "これからお世話になります",
    meaning: "mong được giúp đỡ",
    hanViet: "thế thoại",
  },
  {
    lesson: 2,
    hiragana: "こちらこそよろしく",
    meaning: "chính tôi mới mong được giúp đỡ",
  },
];

const seed = async () => {
  try {
    await connectDB();
    await Vocabulary.deleteMany({ lesson: 2 });
    await Vocabulary.insertMany(vocabLesson2);
    console.log("✅ Seed bài 2 thành công");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
