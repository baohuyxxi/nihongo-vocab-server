import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";

dotenv.config();

const lesson = 7;

const vocabularies = [
  // ===== VERB =====
  {
    lesson,
    kanji: "切る",
    hiragana: "きる",
    romaji: "kiru",
    meaning: "cắt",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "送る",
    hiragana: "おくる",
    romaji: "okuru",
    meaning: "gửi",
    partOfSpeech: "verb",
  },
  {
    lesson,
    hiragana: "あげる",
    romaji: "ageru",
    meaning: "tặng",
    partOfSpeech: "verb",
  },
  {
    lesson,
    hiragana: "もらう",
    romaji: "morau",
    meaning: "nhận",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "貸す",
    hiragana: "かす",
    romaji: "kasu",
    meaning: "cho mượn",
    partOfSpeech: "verb",
  },
  {
    lesson,
    kanji: "借りる",
    hiragana: "かりる",
    romaji: "kariru",
    meaning: "mượn",
    partOfSpeech: "verb",
  },
  {
    lesson,
    hiragana: "かける",
    romaji: "kakeru",
    meaning: "mang (đeo, treo)",
    partOfSpeech: "verb",
  },

  // ===== NOUN =====
  {
    lesson,
    kanji: "手",
    hiragana: "て",
    romaji: "te",
    meaning: "tay",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "はし",
    romaji: "hashi",
    meaning: "cầu",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "スプーン",
    defaultScript: "katakana",
    romaji: "supuun",
    meaning: "muỗng",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ナイフ",
    defaultScript: "katakana",
    romaji: "naifu",
    meaning: "con dao",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "フォーク",
    defaultScript: "katakana",
    romaji: "fooku",
    meaning: "nĩa",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "はさみ",
    romaji: "hasami",
    meaning: "cái kéo",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ファクス",
    defaultScript: "katakana",
    romaji: "fakusu",
    meaning: "máy fax",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ワープロ",
    defaultScript: "katakana",
    romaji: "waapuro",
    meaning: "máy đánh chữ",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "パソコン",
    defaultScript: "katakana",
    romaji: "pasokon",
    meaning: "máy tính",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "パンチ",
    defaultScript: "katakana",
    romaji: "panchi",
    meaning: "cái đục lỗ",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ホッチキス",
    defaultScript: "katakana",
    romaji: "hotchikisu",
    meaning: "cái dập ghim",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "セロテープ",
    defaultScript: "katakana",
    romaji: "seroteepu",
    meaning: "băng dính",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "けしゴム",
    romaji: "keshigomu",
    meaning: "cục tẩy",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "かみ",
    romaji: "kami",
    meaning: "tóc",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "花",
    hiragana: "はな",
    romaji: "hana",
    meaning: "hoa",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "シャツ",
    defaultScript: "katakana",
    romaji: "shatsu",
    meaning: "áo sơ mi",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "プレゼント",
    defaultScript: "katakana",
    romaji: "purezento",
    meaning: "quà tặng",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "荷物",
    hiragana: "にもつ",
    romaji: "nimotsu",
    meaning: "hành lý, hàng hóa",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "お金",
    hiragana: "おかね",
    romaji: "okane",
    meaning: "tiền",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "きっぷ",
    romaji: "kippu",
    meaning: "vé (tàu, xe)",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "クリスマス",
    defaultScript: "katakana",
    romaji: "kurisumasu",
    meaning: "Lễ Giáng sinh",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "父",
    hiragana: "ちち",
    romaji: "chichi",
    meaning: "cha (mình)",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "母",
    hiragana: "はは",
    romaji: "haha",
    meaning: "mẹ (mình)",
    partOfSpeech: "noun",
  },

  // ===== EXPRESSION =====
  {
    lesson,
    hiragana: "これから",
    romaji: "korekara",
    meaning: "từ bây giờ",
    partOfSpeech: "expression",
  },
  {
    lesson,
    kanji: "お父さん",
    hiragana: "おとうさん",
    romaji: "otousan",
    meaning: "cha (người khác)",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "お母さん",
    hiragana: "おかあさん",
    romaji: "okaasan",
    meaning: "mẹ (người khác)",
    partOfSpeech: "noun",
  },
  {
    lesson,
    hiragana: "もう",
    romaji: "mou",
    meaning: "đã rồi",
    partOfSpeech: "adverb",
  },
  {
    lesson,
    hiragana: "まだ",
    romaji: "mada",
    meaning: "vẫn còn, vẫn chưa",
    partOfSpeech: "adverb",
  },
  {
    lesson,
    hiragana: "ごめんなさい",
    romaji: "gomennasai",
    meaning: "xin lỗi",
    partOfSpeech: "expression",
  },
  {
    lesson,
    hiragana: "いらっしゃい",
    romaji: "irasshai",
    meaning: "xin mời",
    partOfSpeech: "expression",
  },
  {
    lesson,
    hiragana: "いってきます",
    romaji: "ittekimasu",
    meaning: "tôi đi đây",
    partOfSpeech: "expression",
  },
  {
    lesson,
    hiragana: "しつれいします",
    romaji: "shitsureishimasu",
    meaning: "xin thất lễ",
    partOfSpeech: "expression",
  },
  {
    lesson,
    kanji: "旅行",
    hiragana: "りょこう",
    romaji: "ryokou",
    meaning: "du lịch",
    partOfSpeech: "noun",
  },
  {
    lesson,
    kanji: "お土産",
    hiragana: "おみやげ",
    romaji: "omiyage",
    meaning: "quà lưu niệm",
    partOfSpeech: "noun",
  },
  {
    lesson,
    katakana: "ヨーロッパ",
    defaultScript: "katakana",
    romaji: "yooroppa",
    meaning: "Châu Âu",
    partOfSpeech: "noun",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Vocabulary.deleteMany({ lesson });
    await Vocabulary.insertMany(vocabularies);
    console.log("✅ Seed Minna bài 7 thành công");
    process.exit();
  } catch (err) {
    console.error("❌ Seed lỗi:", err);
    process.exit(1);
  }
}

seed();
