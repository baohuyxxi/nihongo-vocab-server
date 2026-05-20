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