import Vocabulary from "../models/Vocabulary.js";
import ReviewHistory from "../models/ReviewHistory.js";
import { shuffle } from "../utils/shuffle.js";

/* =========================
   BASIC VOCAB SERVICES
========================= */

export const getAllVocab = async () => {
    return Vocabulary.find().sort({
        lesson: 1,
        unit: 1,
        n3Order: 1,
        _id: 1,
    });
};

export const getVocabByLesson = async (lesson) => {
    return Vocabulary.find({ lesson });
};

export const getVocabByLessons = async (lessons) => {
    return Vocabulary.find({
        lesson: { $in: lessons },
    }).sort({ lesson: 1 });
};

export const getVocabByUnit = async (
    unit,
    n3Topic = ""
) => {
    const filter = { unit };

    if (n3Topic) {
        filter.n3Topic = n3Topic;
    }

    return Vocabulary.find(filter).sort({
        n3Order: 1,
        _id: 1,
    });
};

export const getVocabByTopic = async (topics) => {
    return Vocabulary.find({
        topic: { $in: topics },
    }).sort({ lesson: 1 });
};

/* =========================
   CRUD VOCAB SERVICES
========================= */

export const createVocab = async (data) => {
    return Vocabulary.create(data);
};

export const updateVocab = async (id, data) => {
    return Vocabulary.findByIdAndUpdate(
        id,
        data,
        {
            new: true,
            runValidators: true,
        }
    );
};

export const deleteVocab = async (id) => {
    return Vocabulary.findByIdAndDelete(id);
};

export const createManyVocab = async (vocabs) => {
    return Vocabulary.insertMany(vocabs);
};

export const bulkUpdateVocab = async (vocabs) => {
    if (!Array.isArray(vocabs)) {
        throw new Error("Dữ liệu phải là mảng từ vựng");
    }

    const allowedFields = [
        "lesson",
        "topic",
        "unit",
        "n3Topic",
        "n3Order",
        "kanji",
        "hiragana",
        "katakana",
        "defaultScript",
        "romaji",
        "meaning",
        "hanViet",
        "partOfSpeech",
        "example",
        "audio",
        "phoneticVi",
        "english",
        "image",
        "video",
    ];

    const ops = vocabs.map((v) => {
        if (!v._id) {
            throw new Error("Thiếu _id của từ vựng");
        }

        const update = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(v, field)) {
                update[field] = v[field];
            }
        }

        return {
            updateOne: {
                filter: { _id: v._id },
                update: {
                    $set: update,
                },
            },
        };
    });

    if (!ops.length) {
        return null;
    }

    return Vocabulary.bulkWrite(ops);
};
/* =========================
   OTHER VOCAB SERVICES
========================= */

export const getAllVerbs = async () => {
    return Vocabulary.find({
        hiragana: {
            $regex: "ます$",
        },
    }).sort({
        lesson: 1,
        hiragana: 1,
    });
};

export const getVocabByPartOfSpeech = async (pos) => {
    return Vocabulary.find({
        partOfSpeech: pos,
    });
};

export const countVocabByPartOfSpeech = async (pos) => {
    return Vocabulary.countDocuments({
        partOfSpeech: pos,
    });
};

export const getTest = async () => {
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

    return Vocabulary.aggregate([
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
                        if: {
                            $eq: ["$defaultScript", "katakana"],
                        },
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
};

export const getVocabWithoutImage = async () => {
    const filter = {
        partOfSpeech: "noun",
        $or: [
            { image: { $exists: false } },
            { image: null },
            { image: "" },
        ],
    };

    const [result] = await Vocabulary.aggregate([
        { $match: filter },
        { $sample: { size: 1 } },
    ]);

    const remaining = await Vocabulary.countDocuments(filter);

    return {
        result: result || null,
        remaining,
    };
};

/* =========================
   REVIEW HELPERS
========================= */

const getJP = (v) => {
    return v.hiragana || v.katakana || v.romaji || "";
};

/* =========================
   FLASHCARD
========================= */

const buildFlashcards = (vocabs, directions) => {
    const cards = [];

    vocabs.forEach((v) => {
        directions.forEach((dir) => {
            // JP -> VI
            if (dir === "jp_vi") {
                cards.push({
                    id: v._id,
                    front: getJP(v),
                    back: v.meaning,
                    direction: dir,
                });
            }

            // VI -> JP
            if (dir === "vi_jp") {
                cards.push({
                    id: v._id,
                    front: v.meaning,
                    back: getJP(v),
                    direction: dir,
                });
            }

            // KANJI
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
                });
            }

            // IMAGE
            if (dir === "image") {
                if (
                    v.image === undefined ||
                    v.image === null ||
                    v.image === ""
                ) {
                    console.log(v.image);
                } else {
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
                    });
                }
            }
        });
    });

    return {
        mode: "flashcard",
        total: cards.length,
        cards: shuffle(cards),
    };
};

/* =========================
   QUIZ CHOICE
========================= */

const buildQuizChoice = (vocabs, directions) => {
    const questions = [];

    vocabs.forEach((v) => {
        directions.forEach((dir) => {
            // SAME TYPE POOL
            const sameTypePool = vocabs.filter(
                (x) =>
                    x._id.toString() !== v._id.toString() &&
                    x.partOfSpeech === v.partOfSpeech
            );

            // SAME TOPIC POOL
            const sameTopicPool = vocabs.filter(
                (x) =>
                    x._id.toString() !== v._id.toString() &&
                    x.topic === v.topic
            );

            // PRIORITY
            let distractors = shuffle(sameTypePool);

            // Chưa đủ thì thêm cùng topic
            if (distractors.length < 3) {
                const remain = sameTopicPool.filter(
                    (x) =>
                        !distractors.some(
                            (d) => d._id.toString() === x._id.toString()
                        )
                );

                distractors = [
                    ...distractors,
                    ...shuffle(remain),
                ];
            }

            // Vẫn chưa đủ thì lấy ngẫu nhiên
            if (distractors.length < 3) {
                const remain = vocabs.filter(
                    (x) =>
                        x._id.toString() !== v._id.toString() &&
                        !distractors.some(
                            (d) => d._id.toString() === x._id.toString()
                        )
                );

                distractors = [
                    ...distractors,
                    ...shuffle(remain),
                ];
            }

            const wrongVocabs = distractors.slice(0, 3);

            // JP -> VI
            if (dir === "jp_vi") {
                const wrong = wrongVocabs.map((x) => x.meaning);

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
                });
            }

            // VI -> JP
            if (dir === "vi_jp") {
                const wrong = wrongVocabs.map((x) => getJP(x));

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
                });
            }

            // KANJI QUIZ
            if (dir === "kanji" && v.kanji) {
                const wrong = wrongVocabs
                    .filter((x) => x.kanji)
                    .map((x) => x.kanji);

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
                    });
                }
            }
        });
    });

    return {
        mode: "quiz",
        total: questions.length,
        questions: shuffle(questions),
    };
};

/* =========================
   REVIEW SESSION SERVICE
========================= */

/* =========================
   REVIEW SESSION SERVICE
========================= */

export const createReviewSession = async (params) => {
    const {
        reviewId = "",
        lessons = "",
        topics = "",

        // N3
        units = "",
        n3Topics = "",

        partsOfSpeech = "",
        mode = "flashcard",
        directions = "jp_vi",
        limit = "",
    } = params;

    /* =========================
       HELPERS
    ========================= */

    const parseArray = (value) => {
        if (Array.isArray(value)) {
            return value
                .map((x) => String(x).trim())
                .filter(Boolean);
        }

        if (value === null || value === undefined || value === "") {
            return [];
        }

        return String(value)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
    };

    const parseNumbers = (value) => {
        return [
            ...new Set(
                parseArray(value)
                    .map(Number)
                    .filter((x) => Number.isInteger(x) && x > 0)
            ),
        ];
    };

    const parseStrings = (value) => {
        return [...new Set(parseArray(value))];
    };

    const escapeRegex = (value) => {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const parseLimit = (value) => {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(value);

        return Number.isInteger(number) && number > 0
            ? number
            : null;
    };

    /* =========================
       SESSION VARIABLES
    ========================= */

    let history = null;
    let isNewSession = false;

    let lessonArr = [];
    let topicArr = [];

    // N3
    let unitArr = [];
    let n3TopicArr = [];

    let partOfSpeechArr = [];
    let directionArr = [];

    let currentMode = mode;
    let reviewLimit = parseLimit(limit);

    /* =========================
       EXISTING SESSION
    ========================= */

    if (reviewId) {
        history = await ReviewHistory.findById(reviewId);

        if (!history) {
            return {
                error: "Review session không tồn tại hoặc đã hết hạn",
            };
        }

        let savedConfig;

        try {
            savedConfig = JSON.parse(history.configKey);
        } catch (err) {
            return {
                error: "Config của review session không hợp lệ",
            };
        }

        lessonArr = parseNumbers(savedConfig.lessons);
        topicArr = parseStrings(savedConfig.topics);

        // N3
        unitArr = parseNumbers(savedConfig.units);
        n3TopicArr = parseStrings(savedConfig.n3Topics);

        partOfSpeechArr = parseStrings(
            savedConfig.partsOfSpeech
        );

        directionArr = parseStrings(
            savedConfig.directions
        );

        currentMode = savedConfig.mode || "flashcard";

        // Phiên mới lưu limit vào configKey.
        // Phiên cũ chưa có limit thì sử dụng tham số request.
        reviewLimit =
            savedConfig.limit !== undefined
                ? parseLimit(savedConfig.limit)
                : parseLimit(limit);
    } else {
        /* =========================
           NEW SESSION
        ========================= */

        lessonArr = parseNumbers(lessons);

        topicArr = parseStrings(topics)
            .map((x) => x.toLowerCase());

        // N3
        unitArr = parseNumbers(units);
        n3TopicArr = parseStrings(n3Topics);

        partOfSpeechArr = parseStrings(partsOfSpeech);
        directionArr = parseStrings(directions);

        currentMode = mode;
    }

    /* =========================
       VALIDATE MODE
    ========================= */

    const validModes = [
        "flashcard",
        "quiz",
        "typing",
    ];

    if (!validModes.includes(currentMode)) {
        return {
            error: "Mode không hợp lệ",
        };
    }

    if (!directionArr.length) {
        return {
            error: "Chưa chọn hướng ôn tập",
        };
    }

    const validDirections = [
        "jp_vi",
        "vi_jp",
        "kanji",
        "image",
    ];

    if (
        directionArr.some(
            (direction) => !validDirections.includes(direction)
        )
    ) {
        return {
            error: "Hướng ôn tập không hợp lệ",
        };
    }

    // Chế độ typing chưa có buildTyping trong service bạn gửi.
    // Không tạo lịch sử hoặc ghi vocabIds khi chưa hỗ trợ.
    if (currentMode === "typing") {
        return {
            error: "Chưa có hàm buildTyping trong vocab.service.js",
        };
    }

    /* =========================
       BUILD FILTER
    ========================= */

    const conditions = [];

    /*
      MINNA LESSONS
    */

    if (lessonArr.length > 0) {
        conditions.push({
            lesson: {
                $in: lessonArr,
            },
        });
    }

    /*
      MINNA TOPICS
    */

    if (topicArr.length > 0) {
        conditions.push({
            topic: {
                $in: topicArr.map(
                    (topic) =>
                        new RegExp(
                            `^${escapeRegex(topic)}$`,
                            "i"
                        )
                ),
            },
        });
    }

    /*
      N3 UNITS
  
      Ví dụ:
      units = [1, 2, 3]
  
      Lấy tất cả từ thuộc Unit 1, 2, 3.
    */

    if (unitArr.length > 0) {
        conditions.push({
            unit: {
                $in: unitArr,
            },
        });
    }

    /*
      N3 TOPICS
  
      Ví dụ:
      n3Topics = ["1", "2", "5"]
  
      Lấy các từ thuộc Topic 1, 2, 5.
  
      Topic được chọn độc lập với Unit.
    */

    if (n3TopicArr.length > 0) {
        conditions.push({
            n3Topic: {
                $in: n3TopicArr,
            },
        });
    }

    /*
      PART OF SPEECH
  
      Giữ logic OR của code gốc.
    */

    if (partOfSpeechArr.length > 0) {
        conditions.push({
            partOfSpeech: {
                $in: partOfSpeechArr,
            },
        });
    }

    /*
      Không có bộ lọc nào:
      tránh lấy toàn bộ database ngoài ý muốn.
    */

    if (conditions.length === 0) {
        return {
            error: "Chưa chọn phạm vi từ vựng để ôn tập",
        };
    }

    let query = {};

    if (conditions.length === 1) {
        query = conditions[0];
    } else {
        query = {
            $or: conditions,
        };
    }

    /* =========================
       CREATE NEW HISTORY
    ========================= */

    if (!history) {
        const configKey = JSON.stringify({
            lessons: [...lessonArr].sort((a, b) => a - b),
            topics: [...topicArr].sort(),

            // N3
            units: [...unitArr].sort((a, b) => a - b),
            n3Topics: [...n3TopicArr].sort(
                (a, b) => Number(a) - Number(b)
            ),

            partsOfSpeech: [...partOfSpeechArr].sort(),

            mode: currentMode,
            directions: [...directionArr].sort(),

            limit: reviewLimit,
        });

        history = await ReviewHistory.create({
            configKey,
            vocabIds: [],
        });

        isNewSession = true;
    } else {
        history.updatedAt = new Date();
        await history.save();
    }

    /* =========================
       FIND VOCABS
    ========================= */

    const allVocabs = await Vocabulary.find(query)
        .select("_id")
        .lean();

    const allIds = allVocabs.map(
        (vocab) => vocab._id
    );

    const totalVocabs = allIds.length;

    /*
      Giữ nguyên cơ chế của code gốc:
  
      history.vocabIds lưu các từ đã được
      đưa vào phiên ôn tập trước đó.
    */

    const reviewedIds = history.vocabIds || [];

    const reviewedSet = new Set(
        reviewedIds.map((id) => id.toString())
    );

    let remainingIds = allIds.filter(
        (id) => !reviewedSet.has(id.toString())
    );

    /* =========================
       SESSION COMPLETED
    ========================= */

    if (remainingIds.length === 0) {
        return {
            data: {
                mode: currentMode,
                total: 0,
                cards: [],
                questions: [],
            },

            message: "Đã lấy hết toàn bộ từ trong session",

            meta: {
                reviewId: history._id,
                isNewSession,

                progress: {
                    selectedVocabs: 0,
                    reviewedVocabs: reviewedSet.size,
                    total: totalVocabs,
                    limit: reviewLimit,
                    remaining: 0,
                    completed: true,
                },
            },
        };
    }

    /* =========================
       SELECT VOCABS
    ========================= */

    remainingIds = shuffle(remainingIds);

    const selectedIds = reviewLimit
        ? remainingIds.slice(0, reviewLimit)
        : remainingIds;

    /* =========================
       LOAD SELECTED VOCABS
    ========================= */

    const vocabs = await Vocabulary.find({
        _id: {
            $in: selectedIds,
        },
    });

    const vocabMap = new Map(
        vocabs.map((vocab) => [
            vocab._id.toString(),
            vocab,
        ])
    );

    const orderedVocabs = selectedIds
        .map((id) => vocabMap.get(id.toString()))
        .filter(Boolean);

    /* =========================
       BUILD REVIEW DATA
    ========================= */

    let data;

    switch (currentMode) {
        case "flashcard":
            data = buildFlashcards(
                orderedVocabs,
                directionArr
            );
            break;

        case "quiz":
            data = buildQuizChoice(
                orderedVocabs,
                directionArr
            );
            break;

        default:
            return {
                error: "Mode không hợp lệ",
            };
    }

    /* =========================
       SAVE SELECTED VOCABS
    ========================= */

    if (orderedVocabs.length > 0) {
        history.vocabIds.push(
            ...orderedVocabs.map((vocab) => vocab._id)
        );

        history.updatedAt = new Date();

        await history.save();
    }

    /* =========================
       PROGRESS
    ========================= */

    const reviewedVocabs = history.vocabIds.length;

    const remaining = Math.max(
        0,
        totalVocabs - reviewedVocabs
    );

    return {
        data,

        message: "Tạo review session thành công",

        meta: {
            reviewId: history._id,
            isNewSession,
            limit: reviewLimit,

            progress: {
                selectedVocabs: orderedVocabs.length,
                reviewedVocabs,
                total: totalVocabs,
                limit: reviewLimit,
                remaining,
                completed: remaining === 0,
            },
        },
    };
};
/* =========================
   COMPLETE REVIEW VOCAB
========================= */

export const completeReviewVocab = async (
    reviewId,
    vocabId
) => {
    const history = await ReviewHistory.findById(reviewId);

    if (!history) {
        return null;
    }

    history.vocabIds = history.vocabIds.filter(
        (id) => id.toString() !== vocabId.toString()
    );

    history.updatedAt = new Date();

    await history.save();

    return {
        reviewId: history._id,
        remaining: history.vocabIds.length,
        completed: history.vocabIds.length === 0,
    };
};