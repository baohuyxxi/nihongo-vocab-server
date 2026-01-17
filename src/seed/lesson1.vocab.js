import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";
import connectDB from "../config/db.js";

dotenv.config();

const vocabLesson1 = [
  {
    lesson: 1,
    hiragana: "わたし",
    kanji: "私",
    meaning: "tôi",
    hanViet: "tư",
    partOfSpeech: "noun",
  },
  {
    lesson: 1,
    hiragana: "わたしたち",
    kanji: "私たち",
    meaning: "chúng tôi",
    hanViet: "tư",
    partOfSpeech: "noun",
  },
  {
    lesson: 1,
    hiragana: "あなた",
    meaning: "anh/chị, ông/bà, bạn",
    partOfSpeech: "pronoun",
  },
  {
    lesson: 1,
    hiragana: "あのひと",
    kanji: "あの人",
    meaning: "người kia",
    hanViet: "nhân",
  },
  {
    lesson: 1,
    hiragana: "あのかた",
    kanji: "あの方",
    meaning: "vị kia (lịch sự)",
    hanViet: "phương",
  },
  {
    lesson: 1,
    hiragana: "みなさん",
    meaning: "mọi người",
  },
  {
    lesson: 1,
    hiragana: "～さん",
    meaning: "anh/chị/ông/bà (lịch sự)",
  },
  {
    lesson: 1,
    hiragana: "～ちゃん",
    meaning: "bé, gọi thân mật",
  },
  {
    lesson: 1,
    hiragana: "～くん",
    meaning: "bé (nam), gọi thân mật",
  },
  {
    lesson: 1,
    hiragana: "～じん",
    kanji: "～人",
    meaning: "người nước ~",
    hanViet: "nhân",
  },
  {
    lesson: 1,
    hiragana: "せんせい",
    kanji: "先生",
    meaning: "giáo viên",
    hanViet: "tiên sinh",
  },
  {
    lesson: 1,
    hiragana: "きょうし",
    kanji: "教師",
    meaning: "giáo viên (nghề)",
    hanViet: "giáo sư",
  },
  {
    lesson: 1,
    hiragana: "がくせい",
    kanji: "学生",
    meaning: "học sinh, sinh viên",
    hanViet: "học sinh",
  },
  {
    lesson: 1,
    hiragana: "かいしゃいん",
    kanji: "会社員",
    meaning: "nhân viên công ty",
    hanViet: "công ty viên",
  },
  {
    lesson: 1,
    hiragana: "～しゃいん",
    kanji: "社員",
    meaning: "nhân viên ~",
    hanViet: "xã viên",
  },
  {
    lesson: 1,
    hiragana: "ぎんこういん",
    kanji: "銀行員",
    meaning: "nhân viên ngân hàng",
    hanViet: "ngân hàng viên",
  },
  {
    lesson: 1,
    hiragana: "いしゃ",
    kanji: "医者",
    meaning: "bác sĩ",
    hanViet: "y giả",
  },
  {
    lesson: 1,
    hiragana: "けんきゅうしゃ",
    kanji: "研究者",
    meaning: "nhà nghiên cứu",
    hanViet: "nghiên cứu giả",
  },
  {
    lesson: 1,
    katakana: "エンジニア",
    meaning: "kỹ sư",
  },
  {
    lesson: 1,
    hiragana: "だいがく",
    kanji: "大学",
    meaning: "đại học",
    hanViet: "đại học",
  },
  {
    lesson: 1,
    hiragana: "びょういん",
    kanji: "病院",
    meaning: "bệnh viện",
    hanViet: "bệnh viện",
  },
  {
    lesson: 1,
    hiragana: "でんき",
    kanji: "電気",
    meaning: "điện",
    hanViet: "điện khí",
  },
  {
    lesson: 1,
    hiragana: "だれ",
    kanji: "誰",
    meaning: "ai",
    hanViet: "thùy",
  },
  {
    lesson: 1,
    hiragana: "～さい",
    kanji: "～歳",
    meaning: "tuổi",
    hanViet: "tuế",
  },
  {
    lesson: 1,
    hiragana: "なんさい",
    kanji: "何歳",
    meaning: "mấy tuổi",
    hanViet: "hà tuế",
  },
  { lesson: 1, hiragana: "はい", meaning: "vâng" },
  { lesson: 1, hiragana: "いいえ", meaning: "không" },
  {
    lesson: 1,
    hiragana: "しつれいですが",
    kanji: "失礼ですが",
    meaning: "xin lỗi (khi nhờ)",
    hanViet: "thất lễ",
  },
  {
    lesson: 1,
    hiragana: "おなまえは",
    kanji: "お名前は",
    meaning: "bạn tên gì?",
    hanViet: "danh",
  },
  {
    lesson: 1,
    hiragana: "はじめまして",
    kanji: "初めて",
    meaning: "chào lần đầu gặp",
    hanViet: "sơ",
  },
  {
    lesson: 1,
    hiragana: "どうぞよろしく",
    meaning: "rất hân hạnh được làm quen",
  },
  {
    lesson: 1,
    hiragana: "～からきました",
    kanji: "～から来ました",
    meaning: "đến từ ~",
    hanViet: "lai",
  },
  { lesson: 1, katakana: "アメリカ", meaning: "Mỹ" },
  { lesson: 1, katakana: "イギリス", meaning: "Anh" },
  { lesson: 1, katakana: "インド", meaning: "Ấn Độ" },
  { lesson: 1, katakana: "インドネシア", meaning: "Indonesia" },
  { lesson: 1, hiragana: "かんこく", kanji: "韓国", meaning: "Hàn Quốc" },
  { lesson: 1, katakana: "タイ", meaning: "Thái Lan" },
  { lesson: 1, hiragana: "ちゅうごく", kanji: "中国", meaning: "Trung Quốc" },
  { lesson: 1, katakana: "ドイツ", meaning: "Đức" },
  { lesson: 1, hiragana: "にほん", kanji: "日本", meaning: "Nhật Bản" },
  { lesson: 1, katakana: "フランス", meaning: "Pháp" },
  { lesson: 1, katakana: "ブラジル", meaning: "Brazil" },
];

const seed = async () => {
  try {
    await connectDB();
    await Vocabulary.deleteMany({ lesson: 1 });
    await Vocabulary.insertMany(vocabLesson1);
    console.log("✅ Seed bài 1 thành công");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
