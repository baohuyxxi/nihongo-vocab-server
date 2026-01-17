import Vocabulary from "../models/Vocabulary.js"
import { successResponse, errorResponse } from "../utils/response.js"
import { shuffle } from "../utils/shuffle.js"

/* =========================
   BASIC VOCAB APIs
========================= */

export const getAllVocab = async (req, res) => {
  try {
    const data = await Vocabulary.find().sort({ lesson: 1 })
    return successResponse(res, data, "Lấy tất cả từ vựng thành công", {
      total: data.length,
    })
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const getVocabByLesson = async (req, res) => {
  try {
    const lesson = Number(req.params.lesson)
    const data = await Vocabulary.find({ lesson })
    return successResponse(
      res,
      data,
      `Lấy từ vựng bài ${lesson} thành công`,
      { total: data.length }
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const getVocabByLessons = async (req, res) => {
  try {
    const lessons = req.query.lessons.split(",").map(Number)
    const data = await Vocabulary.find({
      lesson: { $in: lessons },
    }).sort({ lesson: 1 })

    return successResponse(res, data, "Lấy từ vựng theo nhiều bài thành công", {
      total: data.length,
    })
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

/* =========================
   REVIEW SESSION API
========================= */

export const reviewSession = async (req, res) => {
  try {
    const {
      lessons = "",
      mode = "flashcard",
      directions = "jp_vi",
    } = req.query

    const lessonArr = lessons.split(",").map(Number)
    const directionArr = directions.split(",")

    const vocabs = await Vocabulary.find({
      lesson: { $in: lessonArr },
    })

    let data

    switch (mode) {
      case "flashcard":
        data = buildFlashcards(vocabs, directionArr)
        break
      case "typing":
        data = buildTyping(vocabs, directionArr)
        break
      case "quiz":
        data = buildQuizChoice(vocabs)
        break
      default:
        return errorResponse(res, "Mode không hợp lệ")
    }

    return successResponse(res, data, "Tạo review session thành công")
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

/* =========================
   BUILDERS
========================= */

const getJP = (v) => v.hiragana || v.katakana || v.romaji || ""

const buildFlashcards = (vocabs, directions) => {
  const cards = []

  vocabs.forEach((v) => {
    directions.forEach((dir) => {
      if (dir === "jp_vi") {
        cards.push({
          id: v._id,
          front: getJP(v),
          back: v.meaning,
          direction: dir,
        })
      }

      if (dir === "vi_jp") {
        cards.push({
          id: v._id,
          front: v.meaning,
          back: getJP(v),
          direction: dir,
        })
      }

      if (dir === "kanji" && v.kanji) {
        cards.push({
          id: v._id,
          front: v.kanji,
          back: {
            jp: getJP(v),
            meaning: v.meaning,
            hanViet: v.hanViet || null,
          },
          direction: dir,
        })
      }
    })
  })

  return {
    mode: "flashcard",
    total: cards.length,
    cards: shuffle(cards),
  }
}

const buildTyping = (vocabs, directions) => {
  const questions = []

  vocabs.forEach((v) => {
    directions.forEach((dir) => {
      if (dir === "jp_vi") {
        questions.push({
          id: v._id,
          question: getJP(v),
          answer: v.meaning,
          direction: dir,
        })
      }

      if (dir === "vi_jp") {
        questions.push({
          id: v._id,
          question: v.meaning,
          answer: getJP(v),
          direction: dir,
        })
      }

      /* ===== KANJI TYPING ===== */
      if (dir === "kanji" && v.kanji && v.hanViet) {
        questions.push({
          id: v._id,
          question: v.kanji,      // ✅ hỏi kanji
          answer: v.hanViet,      // ✅ trả lời Hán Việt
          direction: "kanji",
        })
      }
    })
  })

  return {
    mode: "typing",
    total: questions.length,
    questions: shuffle(questions),
  }
}


const buildQuizChoice = (vocabs) => {
  const meanings = vocabs.map((v) => v.meaning)

  const questions = vocabs.map((v) => {
    const wrong = shuffle(meanings.filter((m) => m !== v.meaning)).slice(0, 3)

    return {
      id: v._id,
      question: getJP(v),
      correct: v.meaning,
      choices: shuffle([v.meaning, ...wrong]),
    }
  })

  return {
    mode: "quiz",
    total: questions.length,
    questions: shuffle(questions),
  }
}


export const updateVocab = async (req, res) => {
  try {
    const { id } = req.params

    const vocab = await Vocabulary.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    )

    return successResponse(res, vocab, "Cập nhật từ vựng thành công")
  } catch (err) {
    return errorResponse(res, err.message)
  }
}


export const bulkUpdateVocab = async (req, res) => {
  try {
    const ops = req.body.map(v => ({
      updateOne: {
        filter: { _id: v._id },
        update: {
          lesson: v.lesson,
          kanji: v.kanji,
          hiragana: v.hiragana,
          katakana: v.katakana,
          romaji: v.romaji,
          meaning: v.meaning,
          hanViet: v.hanViet,
          partOfSpeech: v.partOfSpeech,
          example: v.example,
          audio: v.audio,
          phoneticVi: v.phoneticVi,
        },
      },
    }))

    await Vocabulary.bulkWrite(ops)

    return successResponse(res, null, "Lưu tất cả từ vựng thành công")
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const createVocab = async (req, res) => {
  try {
    const vocab = await Vocabulary.create(req.body)
    return successResponse(res, vocab, "Thêm từ vựng thành công")
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const deleteVocab = async (req, res) => {
  try {
    await Vocabulary.findByIdAndDelete(req.params.id)
    return successResponse(res, null, "Xoá từ vựng thành công")
  } catch (err) {
    return errorResponse(res, err.message)
  }
}


export const createManyVocab = async (req, res) => {
  try {
    const vocabs = req.body

    if (!Array.isArray(vocabs)) {
      return errorResponse(res, "Body phải là mảng từ vựng")
    }

    const data = await Vocabulary.insertMany(vocabs)

    return successResponse(
      res,
      data,
      "Thêm nhiều từ vựng thành công",
      { total: data.length }
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}
