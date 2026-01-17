import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";

dotenv.config();

const lesson = 6;

const vocabularies = [
  {
    lesson,
    kanji: "食べます",
    hiragana: "たべます",
    romaji: "tabemasu",
    meaning: "ăn",
    partOfSpeech: "verb",
    example: { jp: "ごはんを食べます。", vi: "Tôi ăn cơm." },
  },
  {
    lesson,
    kanji: "飲みます",
    hiragana: "のみます",
    romaji: "nomimasu",
    meaning: "uống",
    partOfSpeech: "verb",
    example: { jp: "水を飲みます。", vi: "Tôi uống nước." },
  },
  {
    lesson,
    kanji: "吸います",
    hiragana: "すいます",
    romaji: "suimasu",
    meaning: "hút (thuốc lá)",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "見ます",
    hiragana: "みます",
    romaji: "mimasu",
    meaning: "xem, nhìn",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "聞きます",
    hiragana: "ききます",
    romaji: "kikimasu",
    meaning: "nghe",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "読みます",
    hiragana: "よみます",
    romaji: "yomimasu",
    meaning: "đọc",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "書きます",
    hiragana: "かきます",
    romaji: "kakimasu",
    meaning: "viết, vẽ",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "買います",
    hiragana: "かいます",
    romaji: "kaimasu",
    meaning: "mua",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "撮ります",
    hiragana: "とります",
    romaji: "torimasu",
    meaning: "chụp (ảnh)",
    partOfSpeech: "verb",
  },
  {
    lesson,
    hiragana: "します",
    romaji: "shimasu",
    meaning: "làm",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "会います",
    hiragana: "あいます",
    romaji: "aimasu",
    meaning: "gặp",
    partOfSpeech: "verb",
  },

  // ======= DANH TỪ =======
  {
    lesson,
    hiragana: "ごはん",
    romaji: "gohan",
    meaning: "cơm, bữa ăn",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "朝ごはん",
    hiragana: "あさごはん",
    romaji: "asagohan",
    meaning: "cơm sáng",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "昼ごはん",
    hiragana: "ひるごはん",
    romaji: "hirugohan",
    meaning: "cơm trưa",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "晩ごはん",
    hiragana: "ばんごはん",
    romaji: "bangohan",
    meaning: "cơm tối",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "パン",
    defaultScript: "katakana",
    romaji: "pan",
    meaning: "bánh mì",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "卵",
    hiragana: "たまご",
    romaji: "tamago",
    meaning: "trứng",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "肉",
    hiragana: "にく",
    romaji: "niku",
    meaning: "thịt",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "魚",
    hiragana: "さかな",
    romaji: "sakana",
    meaning: "cá",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "野菜",
    hiragana: "やさい",
    romaji: "yasai",
    meaning: "rau",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "果物",
    hiragana: "くだもの",
    romaji: "kudamono",
    meaning: "trái cây",
    partOfSpeech: "noun",
  },

  // ======= KATAKANA =======
  {
    lesson,
    katakana: "ビール",
    defaultScript: "katakana",
    romaji: "biiru",
    meaning: "bia",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ジュース",
    defaultScript: "katakana",
    romaji: "juusu",
    meaning: "nước hoa quả",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "メキシコ",
    defaultScript: "katakana",
    romaji: "mekishiko",
    meaning: "Mexico",
    partOfSpeech: "noun",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Vocabulary.deleteMany({ lesson });
    await Vocabulary.insertMany(vocabularies);
    console.log("✅ Seed Minna bài 6 thành công");
    process.exit();
  } catch (error) {
    console.error("❌ Seed lỗi:", error);
    process.exit(1);
  }
}

seed();
