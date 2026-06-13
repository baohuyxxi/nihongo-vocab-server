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
      topics = "",
      partsOfSpeech = "",
      mode = "flashcard",
      directions = "jp_vi",
    } = req.query

    /* ======================
        PARSE INPUT
    ====================== */

    const lessonArr = lessons
      ? lessons
        .split(",")
        .map(Number)
        .filter((x) => !isNaN(x))
      : []

    const topicArr = topics
      ? topics
        .split(",")
        .map((x) => x.toLowerCase().trim())
      : []

    const partOfSpeechArr = partsOfSpeech
      ? partsOfSpeech
        .split(",")
        .map((x) => x.trim())
      : []

    const directionArr = directions
      .split(",")
      .map((x) => x.trim())

    /* ======================
        BUILD QUERY
    ====================== */

    const conditions = []

    // lesson
    if (lessonArr.length) {
      conditions.push({
        lesson: {
          $in: lessonArr,
        },
      })
    }

    // topic
    if (topicArr.length) {
      conditions.push({
        topic: {
          $in: topicArr.map(
            (t) => new RegExp(`^${t}$`, "i")
          ),
        },
      })
    }

    // part of speech
    if (partOfSpeechArr.length) {
      conditions.push({
        partOfSpeech: {
          $in: partOfSpeechArr,
        },
      })
    }

    let query = {}

    // chỉ 1 filter
    if (conditions.length === 1) {
      query = conditions[0]
    }

    // nhiều filter => OR
    if (conditions.length > 1) {
      query = {
        $or: conditions,
      }
    }

    /* ======================
        FETCH DATA
    ====================== */

    const vocabs = await Vocabulary.find(query)

    /* ======================
        BUILD DATA
    ====================== */

    let data

    switch (mode) {
      case "flashcard":
        data = buildFlashcards(vocabs, directionArr)
        break

      case "typing":
        data = buildTyping(vocabs, directionArr)
        break

      case "quiz":
        data = buildQuizChoice(vocabs, directionArr)
        break

      default:
        return errorResponse(res, "Mode không hợp lệ")
    }

    return successResponse(
      res,
      data,
      "Tạo review session thành công",
      {
        totalVocabs: vocabs.length,
      }
    )

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

const buildQuizChoice = (vocabs, directions) => {

  const questions = []

  vocabs.forEach((v) => {

    directions.forEach((dir) => {

      /* ======================
          SAME TYPE POOL
      ====================== */

      const sameTypePool = vocabs.filter(
        (x) =>
          x._id.toString() !== v._id.toString() &&
          x.partOfSpeech === v.partOfSpeech
      )

      /* ======================
          SAME TOPIC POOL
      ====================== */

      const sameTopicPool = vocabs.filter(
        (x) =>
          x._id.toString() !== v._id.toString() &&
          x.topic === v.topic
      )

      /* ======================
          PRIORITY
      ====================== */

      let distractors = []

      // ưu tiên cùng loại từ
      distractors = shuffle(sameTypePool)

      // chưa đủ => thêm cùng topic
      if (distractors.length < 3) {

        const remain = sameTopicPool.filter(
          (x) =>
            !distractors.some(
              (d) => d._id.toString() === x._id.toString()
            )
        )

        distractors = [
          ...distractors,
          ...shuffle(remain),
        ]
      }

      // vẫn chưa đủ => random
      if (distractors.length < 3) {

        const remain = vocabs.filter(
          (x) =>
            x._id.toString() !== v._id.toString() &&
            !distractors.some(
              (d) => d._id.toString() === x._id.toString()
            )
        )

        distractors = [
          ...distractors,
          ...shuffle(remain),
        ]
      }

      /* ======================
          TAKE 3
      ====================== */

      const wrongVocabs = distractors.slice(0, 3)

      /* ======================
          JP -> VI
      ====================== */

      if (dir === "jp_vi") {

        const wrong = wrongVocabs.map(
          (x) => x.meaning
        )

        questions.push({
          id: v._id,
          direction: dir,

          question: getJP(v),

          correct: v.meaning,

          choices: shuffle([
            v.meaning,
            ...wrong,
          ]),

          partOfSpeech: v.partOfSpeech,
          topic: v.topic,
        })
      }

      /* ======================
          VI -> JP
      ====================== */

      if (dir === "vi_jp") {

        const wrong = wrongVocabs.map(
          (x) => getJP(x)
        )

        questions.push({
          id: v._id,
          direction: dir,

          question: v.meaning,

          correct: getJP(v),

          choices: shuffle([
            getJP(v),
            ...wrong,
          ]),

          partOfSpeech: v.partOfSpeech,
          topic: v.topic,
        })
      }

      /* ======================
          KANJI QUIZ
      ====================== */

      if (
        dir === "kanji" &&
        v.kanji
      ) {

        const wrong = wrongVocabs
          .filter((x) => x.kanji)
          .map((x) => x.kanji)

        if (wrong.length >= 3) {

          questions.push({
            id: v._id,
            direction: dir,

            question: getJP(v),

            correct: v.kanji,

            choices: shuffle([
              v.kanji,
              ...wrong.slice(0, 3),
            ]),

            partOfSpeech: v.partOfSpeech,
            topic: v.topic,
          })
        }
      }

    })

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
          english: v.english,
          image: v.image,
          video: v.video,
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



export const getVocabByTopic = async (req, res) => {
  try {
    const { topics } = req.query

    if (!topics) {
      return errorResponse(res, "Thiếu topics")
    }

    const topicArr = topics.split(",").map(t => t.toLowerCase().trim())

    const data = await Vocabulary.find({
      topic: { $in: topicArr },
    }).sort({ lesson: 1 })

    return successResponse(
      res,
      data,
      "Lấy từ vựng theo topic thành công",
      { total: data.length }
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const getAllVerbs = async (req, res) => {
  try {
    const data = await Vocabulary.find({
      hiragana: {
        $regex: "ます$",
      },
    }).sort({
      lesson: 1,
      hiragana: 1,
    })

    res.json({
      success: true,
      total: data.length,
      data,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    })
  }
}



export const getVocabByPartOfSpeech = async (req, res) => {
  try {
    const validTypes = [
      "noun",
      "verb_g_1",
      "verb_g_2",
      "verb_g_3",
      "adj_i",
      "adj_na",
      "adverb",
      "conjunction",
      "pronoun",
      "interjection",
      "expression",
      "counter",
      "prefix",
      "suffix",
    ];
    const { pos } = req.params;

    // validate
    if (!validTypes.includes(pos)) {
      return res.status(400).json({
        success: false,
        message: "partOfSpeech không hợp lệ",
      });
    }

    // query data + count
    const [data, total] = await Promise.all([
      Vocabulary.find({ partOfSpeech: pos }),
      Vocabulary.countDocuments({ partOfSpeech: pos }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lọc từ vựng theo partOfSpeech thành công",
      total, // 👈 tổng số từ
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const getTest = async (req, res) => {
  try {
    const validPartOfSpeech = [
      "noun",

      "verb_g_1",
      "verb_g_2",
      "verb_g_3",

      "adj_i",
      "adj_na",

      "adverb",
      "conjunction",

      "pronoun",
      "interjection",

      "expression",
      "counter",
      "prefix",
      "suffix",
    ];

    const data = await Vocabulary.aggregate([
      {
        $match: {
          partOfSpeech: {
            $nin: validPartOfSpeech,
          },
        },
      },
      {
        $project: {
          _id: 1,
          kanji: 1,
          meaning: 1,
          partOfSpeech: 1,
          hiragana: {
            $cond: {
              if: { $eq: ["$defaultScript", "katakana"] },
              then: "$katakana",
              else: "$hiragana",
            },
          },
        },
      },
      {
        $sort: {
          lesson: 1,
          _id: 1,
        },
      },
      {
        $limit: 50,
      },
    ]);

    return successResponse(
      res,
      data,
      "Lấy 50 từ vựng chưa có hoặc có loại từ không hợp lệ thành công",
      {
        total: data.length,
      }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};