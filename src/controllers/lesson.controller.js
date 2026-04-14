import Lesson from "../models/Lesson.js"
import Vocabulary from "../models/Vocabulary.js"
import { successResponse, errorResponse } from "../utils/response.js"

/**
 * 📘 Danh sách bài
 */
export const getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ number: 1 })
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * 📘 Chi tiết 1 bài
 */
export const getLessonDetail = async (req, res) => {
  try {
    const lesson = Number(req.params.lesson)
    const data = await Lesson.findOne({ number: lesson })
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * 🚀 Lấy TẤT CẢ PHÓ TỪ (sort theo あいうえお)
 */
export const getAllAdverbs = async (req, res) => {
  try {
    const data = await Vocabulary.find({
      topic: "adverbs",
    })
      .collation({ locale: "ja" }) // sort chuẩn Nhật
      .sort({ hiragana: 1 })

    return successResponse(
      res,
      data,
      "Lấy tất cả phó từ thành công",
      { total: data.length }
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

/**
 * 🚀 Lấy PHÓ TỪ theo GROUP (🔥 dùng cho FE học)
 */
export const getAdverbsGrouped = async (req, res) => {
  try {
    const data = await Vocabulary.find({
      topic: "adverbs",
    }).lean()

    const grouped = {}

    data.forEach((item) => {
      const key = item.group || "other"

      if (!grouped[key]) {
        grouped[key] = []
      }

      grouped[key].push(item)
    })

    // sort từng group theo hiragana
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) =>
        (a.hiragana || "").localeCompare(b.hiragana || "ja")
      )
    })

    return successResponse(
      res,
      grouped,
      "Lấy phó từ theo nhóm thành công"
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}