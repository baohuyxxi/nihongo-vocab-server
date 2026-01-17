import connectDB from "../config/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary.js";
const lesson5Vocabs = [
  // ===== GIAO THÔNG / ĐI LẠI =====
  {
    lesson: 5,
    hiragana: "ばんせん",
    kanji: "―番線",
    meaning: "sân ga số –",
  },
  {
    lesson: 5,
    hiragana: "いきます",
    kanji: "行きます",
    meaning: "đi",
    partOfSpeech: "verb",
  },
  {
    lesson: 5,
    hiragana: "きます",
    kanji: "来ます",
    meaning: "đến",
    partOfSpeech: "verb",
  },
  {
    lesson: 5,
    hiragana: "かえります",
    kanji: "帰ります",
    meaning: "về",
    partOfSpeech: "verb",
  },

  {
    lesson: 5,
    hiragana: "がっこう",
    kanji: "学校",
    meaning: "trường học",
  },
  {
    lesson: 5,
    katakana: "スーパー",
    defaultScript: "katakana",
    meaning: "siêu thị",
  },
  {
    lesson: 5,
    hiragana: "えき",
    kanji: "駅",
    meaning: "ga, nhà ga",
  },
  {
    lesson: 5,
    hiragana: "ひこうき",
    kanji: "飛行機",
    meaning: "máy bay",
  },
  {
    lesson: 5,
    hiragana: "ふね",
    kanji: "船",
    meaning: "thuyền, tàu thủy",
  },
  {
    lesson: 5,
    hiragana: "でんしゃ",
    kanji: "電車",
    meaning: "tàu điện",
  },
  {
    lesson: 5,
    hiragana: "ちかてつ",
    kanji: "地下鉄",
    meaning: "tàu điện ngầm",
  },
  {
    lesson: 5,
    hiragana: "しんかんせん",
    kanji: "新幹線",
    meaning: "tàu Shinkansen",
  },
  {
    lesson: 5,
    katakana: "バス",
    defaultScript: "katakana",
    meaning: "xe buýt",
  },
  {
    lesson: 5,
    katakana: "タクシー",
    defaultScript: "katakana",
    meaning: "tắc-xi",
  },
  {
    lesson: 5,
    hiragana: "じてんしゃ",
    kanji: "自転車",
    meaning: "xe đạp",
  },
  {
    lesson: 5,
    hiragana: "あるいて",
    kanji: "歩いて",
    meaning: "đi bộ",
  },

  // ===== CON NGƯỜI =====
  {
    lesson: 5,
    hiragana: "ひと",
    kanji: "人",
    meaning: "người",
  },
  {
    lesson: 5,
    hiragana: "ともだち",
    kanji: "友達",
    meaning: "bạn, bạn bè",
  },
  {
    lesson: 5,
    hiragana: "かれ",
    kanji: "彼",
    meaning: "anh ấy, bạn trai",
  },
  {
    lesson: 5,
    hiragana: "かのじょ",
    kanji: "彼女",
    meaning: "chị ấy, bạn gái",
  },
  {
    lesson: 5,
    hiragana: "かぞく",
    kanji: "家族",
    meaning: "gia đình",
  },

  // ===== THỜI GIAN =====
  { lesson: 5, hiragana: "せんしゅう", kanji: "先週", meaning: "tuần trước" },
  { lesson: 5, hiragana: "こんしゅう", kanji: "今週", meaning: "tuần này" },
  { lesson: 5, hiragana: "らいしゅう", kanji: "来週", meaning: "tuần sau" },
  { lesson: 5, hiragana: "せんげつ", kanji: "先月", meaning: "tháng trước" },
  { lesson: 5, hiragana: "こんげつ", kanji: "今月", meaning: "tháng này" },
  { lesson: 5, hiragana: "らいげつ", kanji: "来月", meaning: "tháng sau" },
  { lesson: 5, hiragana: "きょねん", kanji: "去年", meaning: "năm ngoái" },
  { lesson: 5, hiragana: "ことし", meaning: "năm nay" },
  { lesson: 5, hiragana: "らいねん", kanji: "来年", meaning: "năm sau" },

  { lesson: 5, hiragana: "がつ", kanji: "月", meaning: "tháng –" },
  { lesson: 5, hiragana: "なんがつ", kanji: "何月", meaning: "tháng mấy" },

  // ===== NGÀY =====
  { lesson: 5, hiragana: "ついたち", kanji: "１日", meaning: "ngày mồng 1" },
  { lesson: 5, hiragana: "ふつか", kanji: "２日", meaning: "ngày mồng 2, 2 ngày" },
  { lesson: 5, hiragana: "みっか", kanji: "３日", meaning: "ngày mồng 3, 3 ngày" },
  { lesson: 5, hiragana: "よっか", kanji: "４日", meaning: "ngày mồng 4, 4 ngày" },
  { lesson: 5, hiragana: "いつか", kanji: "５日", meaning: "ngày mồng 5, 5 ngày" },
  { lesson: 5, hiragana: "むいか", kanji: "６日", meaning: "ngày mồng 6, 6 ngày" },
  { lesson: 5, hiragana: "なのか", kanji: "７日", meaning: "ngày mồng 7, 7 ngày" },
  { lesson: 5, hiragana: "ようか", kanji: "８日", meaning: "ngày mồng 8, 8 ngày" },
  { lesson: 5, hiragana: "ここのか", kanji: "９日", meaning: "ngày mồng 9, 9 ngày" },
  { lesson: 5, hiragana: "とおか", kanji: "１０日", meaning: "ngày mồng 10, 10 ngày" },
  { lesson: 5, hiragana: "じゅうよっか", kanji: "１４日", meaning: "ngày 14, 14 ngày" },
  { lesson: 5, hiragana: "はつか", kanji: "２０日", meaning: "ngày 20, 20 ngày" },
  {
    lesson: 5,
    hiragana: "にじゅうよっか",
    kanji: "２４日",
    meaning: "ngày 24, 24 ngày",
  },
  { lesson: 5, hiragana: "にち", kanji: "日", meaning: "ngày –, – ngày" },
  {
    lesson: 5,
    hiragana: "なんにち",
    kanji: "何日",
    meaning: "ngày mấy / mấy ngày",
  },

  // ===== KHÁC =====
  { lesson: 5, hiragana: "いつ", meaning: "bao giờ, khi nào" },
  {
    lesson: 5,
    hiragana: "たんじょうび",
    kanji: "誕生日",
    meaning: "sinh nhật",
  },
  {
    lesson: 5,
    hiragana: "ふつう",
    kanji: "普通",
    meaning: "tàu thường",
  },
  {
    lesson: 5,
    hiragana: "きゅうこう",
    kanji: "急行",
    meaning: "tàu tốc hành",
  },
  {
    lesson: 5,
    hiragana: "とっきゅう",
    kanji: "特急",
    meaning: "tàu tốc hành đặc biệt",
  },
  {
    lesson: 5,
    hiragana: "つぎの",
    kanji: "次の",
    meaning: "tiếp theo",
  },
  {
    lesson: 5,
    hiragana: "どういたしまして",
    meaning: "không có chi",
    partOfSpeech: "expression",
  },
];
dotenv.config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    await Vocabulary.insertMany(lesson5Vocabs);
    console.log("✅ Seed lesson 5 success");

    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });