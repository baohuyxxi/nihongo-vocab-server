import connectDB from "../config/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";

const lesson3Vocabs = [
  { lesson: 3, hiragana: "ここ", meaning: "chỗ này, đây", partOfSpeech: "noun" },
  { lesson: 3, hiragana: "そこ", meaning: "chỗ đó, đó", partOfSpeech: "noun" },
  { lesson: 3, hiragana: "あそこ", meaning: "chỗ kia, kia", partOfSpeech: "noun" },
  { lesson: 3, hiragana: "どこ", meaning: "chỗ nào, đâu", partOfSpeech: "noun" },

  {
    lesson: 3,
    hiragana: "こちら",
    meaning: "phía này, chỗ này (cách nói lịch sự của ここ)",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "そちら",
    meaning: "phía đó, chỗ đó (cách nói lịch sự của そこ)",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "あちら",
    meaning: "phía kia, chỗ kia (cách nói lịch sự của あそこ)",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "どちら",
    meaning: "phía nào, chỗ nào (cách nói lịch sự của どこ)",
    partOfSpeech: "expression",
  },

  {
    lesson: 3,
    hiragana: "きょうしつ",
    kanji: "教室",
    hanMeaning: "Giáo Thất",
    meaning: "lớp học, phòng học",
  },
  {
    lesson: 3,
    hiragana: "しょくどう",
    kanji: "食堂",
    hanMeaning: "Thực Đường",
    meaning: "nhà ăn",
  },
  {
    lesson: 3,
    hiragana: "じむしょ",
    kanji: "事務所",
    hanMeaning: "Sự Vụ Sở",
    meaning: "văn phòng",
  },
  {
    lesson: 3,
    hiragana: "かいぎしつ",
    kanji: "会議室",
    hanMeaning: "Hội Nghị Thất",
    meaning: "phòng họp",
  },
  {
    lesson: 3,
    hiragana: "うけつけ",
    kanji: "受付",
    hanMeaning: "Thụ Phụ",
    meaning: "bộ phận tiếp tân, lễ tân",
  },

  {
    lesson: 3,
    katakana: "ロビー",
    defaultScript: "katakana",
    meaning: "hành lang, đại sảnh",
  },
  {
    lesson: 3,
    hiragana: "へや",
    kanji: "部屋",
    hanMeaning: "Bộ Ốc",
    meaning: "căn phòng",
  },
  {
    lesson: 3,
    hiragana: "トイレ（おてあらい）",
    kanji: "お手洗い",
    meaning: "nhà vệ sinh",
  },
  {
    lesson: 3,
    hiragana: "かいだん",
    kanji: "階段",
    hanMeaning: "Giai Đoạn",
    meaning: "cầu thang",
  },

  {
    lesson: 3,
    katakana: "エレベーター",
    defaultScript: "katakana",
    meaning: "thang máy",
  },
  {
    lesson: 3,
    katakana: "エスカレーター",
    defaultScript: "katakana",
    meaning: "thang cuốn",
  },

  {
    lesson: 3,
    hiragana: "くに",
    kanji: "国",
    hanMeaning: "Quốc",
    meaning: "đất nước",
  },
  {
    lesson: 3,
    hiragana: "かいしゃ",
    kanji: "会社",
    hanMeaning: "Hội Xã",
    meaning: "công ty",
  },
  {
    lesson: 3,
    hiragana: "うち",
    meaning: "nhà",
  },
  {
    lesson: 3,
    hiragana: "でんわ",
    kanji: "電話",
    hanMeaning: "Điện Thoại",
    meaning: "điện thoại",
  },

  {
    lesson: 3,
    hiragana: "くつ",
    kanji: "靴",
    hanMeaning: "Ngoa",
    meaning: "giày",
  },
  {
    lesson: 3,
    katakana: "ネクタイ",
    defaultScript: "katakana",
    meaning: "cà vạt",
  },
  {
    lesson: 3,
    katakana: "ワイン",
    defaultScript: "katakana",
    meaning: "rượu vang",
  },
  {
    lesson: 3,
    hiragana: "たばこ",
    meaning: "thuốc lá",
  },

  {
    lesson: 3,
    hiragana: "うりば",
    kanji: "売り場",
    hanMeaning: "Mại Trường",
    meaning: "quầy bán hàng",
  },
  {
    lesson: 3,
    hiragana: "ちか",
    kanji: "地下",
    hanMeaning: "Địa Hạ",
    meaning: "tầng hầm",
  },
  {
    lesson: 3,
    hiragana: "かい",
    kanji: "階",
    hanMeaning: "Giai",
    meaning: "tầng",
    partOfSpeech: "counter",
  },
  {
    lesson: 3,
    hiragana: "なんがい",
    kanji: "何階",
    hanMeaning: "Hà Giai",
    meaning: "tầng mấy",
  },

  {
    lesson: 3,
    hiragana: "えん",
    kanji: "円",
    hanMeaning: "Viên",
    meaning: "yên",
    partOfSpeech: "counter",
  },
  {
    lesson: 3,
    hiragana: "いくら",
    meaning: "bao nhiêu tiền",
  },
  {
    lesson: 3,
    hiragana: "ひゃく",
    kanji: "百",
    hanMeaning: "Bách",
    meaning: "trăm",
  },
  {
    lesson: 3,
    hiragana: "せん",
    kanji: "千",
    hanMeaning: "Thiên",
    meaning: "nghìn",
  },
  {
    lesson: 3,
    hiragana: "まん",
    kanji: "万",
    hanMeaning: "Vạn",
    meaning: "mười nghìn",
  },

  {
    lesson: 3,
    hiragana: "すみません",
    meaning: "Xin lỗi",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "でございます",
    meaning: "cách nói lịch sự của です",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "みせてください",
    kanji: "見せてください",
    meaning: "cho tôi xem",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "じゃ",
    meaning: "Thế thì, vậy thì",
    partOfSpeech: "expression",
  },
  {
    lesson: 3,
    hiragana: "ください",
    meaning: "cho tôi ~",
    partOfSpeech: "expression",
  },

  {
    lesson: 3,
    hiragana: "しんおおさか",
    kanji: "新大阪",
    meaning: "tên ga ở Osaka",
  },
  {
    lesson: 3,
    katakana: "イタリア",
    defaultScript: "katakana",
    meaning: "Ý",
  },
  {
    lesson: 3,
    katakana: "スイス",
    defaultScript: "katakana",
    meaning: "Thụy Sĩ",
  },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    await Vocabulary.insertMany(lesson3Vocabs);
    console.log("✅ Seed lesson 3 success");

    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });