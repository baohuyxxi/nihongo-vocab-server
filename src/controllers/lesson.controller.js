// src/controllers/lesson.controller.js

import Lesson from "../models/Lesson.js"

import Vocabulary from "../models/Vocabulary.js"

import {
  successResponse,
  errorResponse,
} from "../utils/response.js"

/**
 * 📘 Danh sách bài
 */
export const getLessons = async (
  req,
  res
) => {
  try {
    const lessons =
      await Lesson.find().sort({
        number: 1,
      })

    res.json(lessons)
  } catch (err) {
    res.status(500).json({
      message: err.message,
    })
  }
}

/**
 * 📘 Chi tiết 1 bài
 */
export const getLessonDetail =
  async (req, res) => {
    try {
      const lesson = Number(
        req.params.lesson
      )

      const data =
        await Lesson.findOne({
          number: lesson,
        })

      res.json(data)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }

/**
 * 🚀 Lấy TẤT CẢ PHÓ TỪ
 */
export const getAllAdverbs =
  async (req, res) => {
    try {
      const data =
        await Vocabulary.find({
          topic: "adverbs",
        })
          .collation({
            locale: "ja",
          })
          .sort({
            hiragana: 1,
          })

      return successResponse(
        res,
        data,
        "Lấy tất cả phó từ thành công",
        {
          total: data.length,
        }
      )
    } catch (err) {
      return errorResponse(
        res,
        err.message
      )
    }
  }

/**
 * 🚀 Lấy PHÓ TỪ theo GROUP
 */
export const getAdverbsGrouped =
  async (req, res) => {
    try {
      const data =
        await Vocabulary.find({
          topic: "adverbs",
        }).lean()

      const grouped = {}

      data.forEach((item) => {
        const key =
          item.group || "other"

        if (!grouped[key]) {
          grouped[key] = []
        }

        grouped[key].push(item)
      })

      Object.keys(grouped).forEach(
        (key) => {
          grouped[key].sort((a, b) =>
            (
              a.hiragana || ""
            ).localeCompare(
              b.hiragana || "",
              "ja"
            )
          )
        }
      )

      return successResponse(
        res,
        grouped,
        "Lấy phó từ theo nhóm thành công"
      )
    } catch (err) {
      return errorResponse(
        res,
        err.message
      )
    }
  }

/**
 * 🚀 Lấy danh sách từ đồng hiragana
 *
 * ví dụ:
 * きます
 * => 来ます, 着ます
 */
export const getDuplicateHiragana =
  async (req, res) => {

    try {

      const data =
        await Vocabulary.aggregate([

          /* ======================
              FILTER VALID DATA
          ====================== */

          {
            $match: {
              hiragana: {
                $exists: true,
                $nin: [null, ""],
              },

              lesson: {
                $exists: true,
                $nin: [null, ""],
              },
            },
          },

          /* ======================
              GROUP BY HIRAGANA
          ====================== */

          {
            $group: {
              _id: "$hiragana",

              count: {
                $sum: 1,
              },

              items: {
                $push: {
                  _id: "$_id",
                  lesson: "$lesson",
                  hiragana: "$hiragana",
                  kanji: "$kanji",
                  meaning: "$meaning",
                  partOfSpeech: "$partOfSpeech",
                },
              },
            },
          },

          /* ======================
              CHECK MEANING UNIQUENESS
          ====================== */

          {
            $addFields: {
              uniqueMeanings: {
                $size: {
                  $setUnion: [
                    {
                      $map: {
                        input: "$items",
                        as: "i",
                        in: "$$i.meaning",
                      },
                    },
                    [],
                  ],
                },
              },
            },
          },

          /* ======================
              REMOVE FULL DUPLICATE MEANING GROUPS
          ====================== */

          {
            $match: {
              count: {
                $gt: 1,
              },

              uniqueMeanings: {
                $gt: 1, // 🔥 nếu chỉ có 1 meaning duy nhất => bỏ
              },
            },
          },

          /* ======================
              SORT
          ====================== */

          {
            $sort: {
              count: -1,
              _id: 1,
            },
          },
        ])

      return successResponse(
        res,
        data,
        "Lấy danh sách từ đồng hiragana thành công",
        {
          total: data.length,
        }
      )

    } catch (err) {

      return errorResponse(
        res,
        err.message
      )
    }
  }


 export const getKanjiFrequency =
  async (req, res) => {
    try {

      const vocabs =
        await Vocabulary.find(
          {
            kanji: {
              $exists: true,
              $nin: [null, ""],
            },

            lesson: {
              $type: "number",
              $gt: 0,
            },
          },
          {
            kanji: 1,
            hiragana: 1,
            katakana: 1,
            meaning: 1,
            hanViet: 1,
            lesson: 1,
            partOfSpeech: 1,
          }
        ).lean()

      const kanjiMap = {}

      for (const vocab of vocabs) {

        const uniqueKanji =
          [...new Set(
            [...vocab.kanji].filter(
              char =>
                /[\u3400-\u4DBF\u4E00-\u9FFF]/u
                  .test(char)
            )
          )]

        for (const kanji of uniqueKanji) {

          if (!kanjiMap[kanji]) {

            kanjiMap[kanji] = {
              kanji,
              words: [],
              wordSet: new Set(),
            }
          }

          // chống trùng:
          // cùng kanji + cùng hiragana + cùng katakana
          const wordKey =
            `${vocab.kanji}|${vocab.hiragana || ""}|${vocab.katakana || ""}`

          if (
            !kanjiMap[kanji]
              .wordSet
              .has(wordKey)
          ) {

            kanjiMap[kanji]
              .wordSet
              .add(wordKey)

            kanjiMap[kanji]
              .words
              .push({
                kanji: vocab.kanji,
                hiragana: vocab.hiragana,
                katakana: vocab.katakana,
                meaning: vocab.meaning,
                hanViet: vocab.hanViet,
                lesson: vocab.lesson,
                partOfSpeech:
                  vocab.partOfSpeech,
              })
          }
        }
      }

      const data =
        Object.values(kanjiMap)

          .map(item => ({

            kanji: item.kanji,

            count:
              item.words.length,

            words:
              item.words.sort(
                (a, b) =>
                  (a.lesson || 999)
                  -
                  (b.lesson || 999)
              ),
          }))

          // chỉ lấy kanji xuất hiện trong >= 2 từ
          .filter(
            item =>
              item.count >= 2
          )

          .sort(
            (a, b) =>
              b.count - a.count
          )

      return successResponse(
        res,
        data,
        "Lấy tần suất Kanji thành công",
        {
          total: data.length,
        }
      )

    } catch (err) {

      return errorResponse(
        res,
        err.message
      )
    }
  }