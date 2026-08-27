import Vocabulary from "../models/Vocabulary.js"
import ReviewHistory from "../models/ReviewHistory.js"
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
      reviewId = "",
      lessons = "",
      topics = "",
      partsOfSpeech = "",
      mode = "flashcard",
      directions = "jp_vi",
      limit = "",
    } = req.query


    /* ======================
        LIMIT
    ====================== */

    const reviewLimit =
      Number(limit) > 0
        ? Number(limit)
        : null


    /* ======================
        FIND SESSION
    ====================== */

    let history = null
    let isNewSession = false


    if (reviewId) {

      history =
        await ReviewHistory.findById(
          reviewId
        )

      if (!history) {

        return errorResponse(
          res,
          "Review session không tồn tại hoặc đã hết hạn"
        )

      }

    }
    let lessonArr = []
    let topicArr = []
    let partOfSpeechArr = []
    let directionArr = []
    let currentMode = mode
    if (history) {
      try {
        const savedConfig =
          JSON.parse(
            history.configKey
          )
        lessonArr =
          savedConfig.lessons || []
        topicArr =
          savedConfig.topics || []
        partOfSpeechArr =
          savedConfig.partsOfSpeech || []
        directionArr =
          savedConfig.directions || []
        currentMode =
          savedConfig.mode ||
          "flashcard"
      }
      catch (err) {
        return errorResponse(
          res,
          "Config của review session không hợp lệ"
        )
      }
      history.updatedAt =
        new Date()
      await history.save()
    }
    else {
      lessonArr =
        lessons
          ? lessons
              .split(",")
              .map(Number)
              .filter(
                (x) =>
                  !isNaN(x)
              )
          : []
      topicArr =
        topics
          ? topics
              .split(",")
              .map(
                (x) =>
                  x
                    .toLowerCase()
                    .trim()
              )
              .filter(Boolean)
          : []
      partOfSpeechArr =
        partsOfSpeech
          ? partsOfSpeech
              .split(",")
              .map(
                (x) =>
                  x.trim()
              )
              .filter(Boolean)
          : []
      directionArr =
        directions
          .split(",")
          .map(
            (x) =>
              x.trim()
          )
          .filter(Boolean)
      currentMode =
        mode
      const configKey =
        JSON.stringify({
          lessons:
            [...lessonArr]
              .sort(),
          topics:
            [...topicArr]
              .sort(),
          partsOfSpeech:
            [...partOfSpeechArr]
              .sort(),
          mode:
            currentMode,
          directions:
            [...directionArr]
              .sort(),
        })
      history =
        await ReviewHistory.create({
          configKey,
          vocabIds: [],
        })
      isNewSession = true
    }

    const conditions = []
    if (
      lessonArr.length
    ) {
      conditions.push({
        lesson: {
          $in: lessonArr,
        },
      })

    }
    if (
      topicArr.length
    ) {
      conditions.push({
        topic: {
          $in:
            topicArr.map(
              (topic) =>
                new RegExp(
                  `^${topic}$`,
                  "i"
                )
            ),
        },
      })
    }
    if (
      partOfSpeechArr.length
    ) {
      conditions.push({

        partOfSpeech: {
          $in:
            partOfSpeechArr,
        },
      })
    }
    let query = {}
    if (
      conditions.length === 1
    ) {
      query =
        conditions[0]
    }
    else if (
      conditions.length > 1
    ) {
      query = {
        $or: conditions,
      }

    }
    const allVocabs =
      await Vocabulary.find(
        query
      )
        .select("_id")
    const allIds =
      allVocabs.map(
        (vocab) =>
          vocab._id
      )
    const totalVocabs =
      allIds.length
    const reviewedIds =
      history.vocabIds || []
    const reviewedSet =
      new Set(
        reviewedIds.map(
          (id) =>
            id.toString()
        )
      )
    let remainingIds =
      allIds.filter(
        (id) =>
          !reviewedSet.has(
            id.toString()
          )
      )
    if (
      remainingIds.length === 0
    ) {
      return successResponse(
        res,
        {
          mode:
            currentMode,
          total: 0,
          cards: [],
          questions: [],
        },
        "Đã lấy hết toàn bộ từ trong session",
        {
          reviewId:
            history._id,
          isNewSession,
          progress: {
            selectedVocabs: 0,
            reviewedVocabs:
              reviewedIds.length,
            total:
              totalVocabs,
            limit:
              reviewLimit,
            remaining: 0,
            completed: true,
          },

        }

      )

    }
    remainingIds =
      shuffle(
        remainingIds
      )
    const selectedIds =
      reviewLimit
        ? remainingIds.slice(
            0,
            reviewLimit
          )
        : remainingIds
    if (
      selectedIds.length > 0
    ) {

      history.vocabIds.push(
        ...selectedIds
      )

      await history.save()

    }
    const vocabs =
      await Vocabulary.find({

        _id: {
          $in: selectedIds,
        },

      })

    const vocabMap =
      new Map(

        vocabs.map(
          (vocab) => [

            vocab._id.toString(),

            vocab,

          ]
        )

      )
    const orderedVocabs =
      selectedIds
        .map(
          (id) =>
            vocabMap.get(
              id.toString()
            )
        )
        .filter(Boolean)
    let data
    switch (
      currentMode
    ) {

      case "flashcard":

        data =
          buildFlashcards(
            orderedVocabs,
            directionArr
          )

        break
      case "typing":
        data =
          buildTyping(
            orderedVocabs,
            directionArr
          )
        break
      case "quiz":
        data =
          buildQuizChoice(
            orderedVocabs,
            directionArr
          )
        break
      default:
        return errorResponse(
          res,
          "Mode không hợp lệ"
        )

    }
    const reviewedVocabs =
      history.vocabIds.length
    const remaining =
      Math.max(
        0,
        totalVocabs -
        reviewedVocabs
      )
    return successResponse(
      res,
      data,
      "Tạo review session thành công",
      {
        reviewId:
          history._id,
        isNewSession,
        limit:
          reviewLimit,
        progress: {
          selectedVocabs:
            orderedVocabs.length,
          reviewedVocabs:
            reviewedVocabs,
          total:
            totalVocabs,
          limit:
            reviewLimit,
          remaining:
            remaining,


          completed:
            remaining === 0,

        },

      }

    )

  }
  catch (err) {

    console.error(
      "reviewSession:",
      err
    )

    return errorResponse(
      res,
      err.message
    )

  }
}
const getJP = (v) => v.hiragana || v.katakana || v.romaji || ""

const buildFlashcards = (vocabs, directions) => {
  const cards = []

  vocabs.forEach((v) => {
    directions.forEach((dir) => {

      /* ======================
          JP → VI
      ====================== */

      if (dir === "jp_vi") {
        cards.push({
          id: v._id,
          front: getJP(v),
          back: v.meaning,
          direction: dir,
        })
      }


      /* ======================
          VI → JP
      ====================== */

      if (dir === "vi_jp") {
        cards.push({
          id: v._id,
          front: v.meaning,
          back: getJP(v),
          direction: dir,
        })
      }


      /* ======================
          KANJI
      ====================== */

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


      /* ======================
          IMAGE
      ====================== */

      if (dir === "image") {
        if (v.image === undefined || v.image === null || v.image === "") {
          console.log(v.image)

        }
        else {
          cards.push({
            id: v._id,

            front: {
              type: "image",
              value: v.image,
            },

            back: {
              jp: getJP(v),
              meaning: v.meaning,
              kanji: v.kanji || null,
              hiragana: v.hiragana || null,
            },

            direction: dir,
          })
        }

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

export const getVocabWithoutImage = async (req, res) => {
  try {
    const filter = {
      partOfSpeech: "noun",
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: "" },
      ],
    }

    // Lấy ngẫu nhiên 1 từ
    const [result] = await Vocabulary.aggregate([
      { $match: filter },
      { $sample: { size: 1 } },
    ])

    // Đếm số từ còn lại
    const remaining = await Vocabulary.countDocuments(filter)

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không còn danh từ nào chưa có ảnh",
        data: null,
        remaining: 0,
      })
    }

    return res.json({
      success: true,
      message: "Lấy từ vựng chưa có ảnh thành công",
      data: result,
      remaining,
    })

  } catch (error) {
    console.error("getVocabWithoutImage:", error)

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    })
  }
}

export const completeReviewVocab = async (
  req,
  res
) => {

  try {

    const {
      reviewId,
      vocabId,
    } = req.params


    /* ======================
        VALIDATE
    ====================== */

    if (!reviewId) {

      return errorResponse(
        res,
        "Thiếu reviewId"
      )

    }


    if (!vocabId) {

      return errorResponse(
        res,
        "Thiếu vocabId"
      )

    }


    /* ======================
        FIND SESSION
    ====================== */

    const history =
      await ReviewHistory.findById(
        reviewId
      )


    if (!history) {

      return errorResponse(
        res,
        "Review session không tồn tại hoặc đã hết hạn"
      )

    }


    /* ======================
        REMOVE VOCAB
    ====================== */

    history.vocabIds =
      history.vocabIds.filter(
        (id) =>
          id.toString() !==
          vocabId.toString()
      )


    /* ======================
        REFRESH TTL
    ====================== */

    history.updatedAt =
      new Date()


    await history.save()


    /* ======================
        RESPONSE
    ====================== */

    return successResponse(

      res,

      {
        reviewId:
          history._id,

        remaining:
          history.vocabIds.length,

        completed:
          history.vocabIds.length === 0,
      },

      "Đã hoàn thành từ vựng"

    )

  }
  catch (err) {

    console.error(
      "completeReviewVocab:",
      err
    )

    return errorResponse(
      res,
      err.message
    )

  }
}