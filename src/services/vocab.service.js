import Vocabulary from "../models/Vocabulary.js";

import ReviewHistory from "../models/ReviewHistory.js";

import { shuffle } from "../utils/shuffle.js";

/* =====================================================

   BASIC VOCAB SERVICES

===================================================== */

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

/* =====================================================

   CRUD VOCAB SERVICES

===================================================== */

export const createVocab = async (data) => {

    return Vocabulary.create(data);

};

export const updateVocab = async (id, data) => {

    return Vocabulary.findByIdAndUpdate(id, data, {

        new: true,

        runValidators: true,

    });

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

            if (

                Object.prototype.hasOwnProperty.call(v, field)

            ) {

                update[field] = v[field];

            }

        }

        return {

            updateOne: {

                filter: { _id: v._id },

                update: { $set: update },

            },

        };

    });

    if (!ops.length) return null;

    return Vocabulary.bulkWrite(ops);

};

/* =====================================================

   OTHER VOCAB SERVICES

===================================================== */

export const getAllVerbs = async () => {

    return Vocabulary.find({

        hiragana: { $regex: "ます$" },

    }).sort({

        lesson: 1,

        hiragana: 1,

    });

};

export const getVocabByPartOfSpeech = async (pos) => {

    return Vocabulary.find({ partOfSpeech: pos });

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

        { $limit: 50 },

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

    const remaining =

        await Vocabulary.countDocuments(filter);

    return {

        result: result || null,

        remaining,

    };

};

/* =====================================================

   REVIEW HELPERS

===================================================== */

const normalize = (value) =>

    String(value ?? "").normalize("NFKC").trim();

const normalizeKey = (value) =>

    normalize(value).toLocaleLowerCase();

const parseArray = (value) => {

    if (Array.isArray(value)) {

        return value

            .map((x) => String(x).trim())

            .filter(Boolean);

    }

    if (value === null || value === undefined) {

        return [];

    }

    return String(value)

        .split(",")

        .map((x) => x.trim())

        .filter(Boolean);

};

const parseNumbers = (value) => [

    ...new Set(

        parseArray(value)

            .map(Number)

            .filter((x) => Number.isInteger(x) && x > 0)

    ),

];

const parseStrings = (value) => [

    ...new Set(parseArray(value)),

];

const parseLimit = (value) => {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return null;

    }

    const number = Number(value);

    return Number.isInteger(number) && number > 0

        ? number

        : null;

};

const escapeRegex = (value) =>

    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getJP = (v) => {

    if (v.defaultScript === "katakana") {

        return normalize(

            v.katakana || v.hiragana || v.romaji

        );

    }

    return normalize(

        v.hiragana || v.katakana || v.romaji

    );

};
// Kiểm tra có ký tự Kanji trong từ.
const containsKanji = (value) =>
    /[\p{Script=Han}々〆ヶ]/u.test(String(value ?? ""));

// Nhật → Việt: ưu tiên chữ Kanji; nếu không có thì dùng Kana như trước.
const getJPDisplay = (v) => {
    const kanji = normalize(v.kanji);
    return containsKanji(kanji) ? kanji : getJP(v);
};


const hasImage = (v) =>

    typeof v.image === "string" &&

    v.image.trim().length > 0;

/* =====================================================

   FLASHCARD

===================================================== */

const buildFlashcards = (vocabs, directions) => {

    const cards = [];

    vocabs.forEach((v) => {

        directions.forEach((dir) => {

            const jp = getJP(v);

            if (dir === "jp_vi" && jp) {
                const display = getJPDisplay(v);
                const hasKanji = containsKanji(display);
                cards.push({
                    id: v._id,
                    front: display,
                    back: v.meaning,
                    direction: dir,
                    kanji: hasKanji ? display : null,
                    hiragana: jp,
                    hanViet: hasKanji ? v.hanViet || null : null,
                });
            }

            if (dir === "vi_jp" && jp) {

                cards.push({

                    id: v._id,

                    front: v.meaning,

                    back: jp,

                    direction: dir,

                });

            }

            if (dir === "kanji" && v.kanji && jp) {

                cards.push({

                    id: v._id,

                    front: v.kanji,

                    back: {

                        jp,

                        meaning: v.meaning,

                        hanViet: v.hanViet || null,

                    },

                    direction: dir,

                });

            }

            if (dir === "jp_kanji" && v.kanji && jp) {

                cards.push({

                    id: v._id,

                    front: jp,

                    back: {

                        jp: v.kanji,

                        meaning: v.meaning,

                        hanViet: v.hanViet || null,

                    },

                    direction: dir,

                });

            }

            if (dir === "image" && hasImage(v)) {

                cards.push({

                    id: v._id,

                    front: {

                        type: "image",

                        value: v.image,

                    },

                    back: {

                        jp,

                        meaning: v.meaning,

                        kanji: v.kanji || null,

                        hiragana: v.hiragana || null,

                    },

                    direction: dir,

                });

            }

        });

    });

    return {

        mode: "flashcard",

        total: cards.length,

        cards: shuffle(cards),

    };

};

/* =====================================================

   QUIZ - ANSWER HELPERS

===================================================== */

const getQuizAnswer = (v, direction) => {

    switch (direction) {

        case "jp_vi":

            return normalize(v.meaning);

        case "vi_jp":

        case "kanji":

        case "image":

            return getJP(v);

        case "jp_kanji":

            return normalize(v.kanji);

        default:

            return "";

    }

};

const getQuizQuestion = (v, direction) => {

    switch (direction) {

        case "jp_vi":

            return getJPDisplay(v);

        case "vi_jp":

            return normalize(v.meaning);

        case "kanji":

            return normalize(v.kanji);

        case "jp_kanji":

            return getJP(v);

        case "image":

            return hasImage(v)

                ? { type: "image", value: v.image }

                : null;

        default:

            return null;

    }

};

/* =====================================================

   QUIZ - TEXT SIMILARITY

===================================================== */

const toChars = (value) =>

    Array.from(normalize(value));

const commonPrefix = (a, b) => {

    const x = toChars(a);

    const y = toChars(b);

    let count = 0;

    while (

        count < x.length &&

        count < y.length &&

        x[count] === y[count]

    ) {

        count++;

    }

    return count;

};

const commonSuffix = (a, b) => {

    const x = toChars(a).reverse().join("");

    const y = toChars(b).reverse().join("");

    return commonPrefix(x, y);

};

const commonCharacters = (a, b) => {

    const counts = new Map();

    for (const char of toChars(b)) {

        counts.set(

            char,

            (counts.get(char) || 0) + 1

        );

    }

    let total = 0;

    for (const char of toChars(a)) {

        const count = counts.get(char) || 0;

        if (count > 0) {

            total++;

            counts.set(char, count - 1);

        }

    }

    return total;

};

const editDistance = (a, b) => {

    const x = toChars(a);

    const y = toChars(b);

    let previous = Array.from(

        { length: y.length + 1 },

        (_, index) => index

    );

    for (let i = 1; i <= x.length; i++) {

        const current = [i];

        for (let j = 1; j <= y.length; j++) {

            const cost =

                x[i - 1] === y[j - 1] ? 0 : 1;

            current[j] = Math.min(

                current[j - 1] + 1,

                previous[j] + 1,

                previous[j - 1] + cost

            );

        }

        previous = current;

    }

    return previous[y.length];

};

const similarityScore = (a, b) => {

    const x = normalize(a);

    const y = normalize(b);

    if (!x || !y || x === y) {

        return -Infinity;

    }

    const lenA = toChars(x).length;

    const lenB = toChars(y).length;

    const lengthDifference = Math.abs(

        lenA - lenB

    );

    const maxLength = Math.max(lenA, lenB);

    const similarity =

        1 - editDistance(x, y) / maxLength;

    let score = similarity * 100;

    if (lengthDifference === 0) {

        score += 50;

    } else if (lengthDifference === 1) {

        score += 20;

    } else if (lengthDifference === 2) {

        score += 5;

    }

    score += commonCharacters(x, y) * 12;

    score += commonPrefix(x, y) * 10;

    score += commonSuffix(x, y) * 8;

    return score;

};

/* =====================================================

   QUIZ - DISTRACTOR SCORING

===================================================== */

const scoreDistractor = (

    correct,

    candidate,

    direction

) => {

    const correctAnswer =

        getQuizAnswer(correct, direction);

    const candidateAnswer =

        getQuizAnswer(candidate, direction);

    if (

        !candidateAnswer ||

        normalizeKey(correctAnswer) ===

        normalizeKey(candidateAnswer)

    ) {

        return -Infinity;

    }

    let score = similarityScore(

        correctAnswer,

        candidateAnswer

    );

    if (!Number.isFinite(score)) {

        return -Infinity;

    }

    // Ưu tiên cùng loại từ

    if (

        correct.partOfSpeech &&

        correct.partOfSpeech === candidate.partOfSpeech

    ) {

        score += 18;

    }

    // Ưu tiên cùng topic

    if (

        correct.topic &&

        correct.topic === candidate.topic

    ) {

        score += 8;

    }

    // Ưu tiên cùng N3 topic

    if (

        correct.n3Topic &&

        correct.n3Topic === candidate.n3Topic

    ) {

        score += 5;

    }

    // Kanji -> Kana

    if (direction === "kanji") {

        const correctJP = getJP(correct);

        const candidateJP = getJP(candidate);

        const lengthDifference = Math.abs(

            toChars(correctJP).length -

            toChars(candidateJP).length

        );

        if (lengthDifference === 0) {

            score += 25;

        }

        score +=

            commonCharacters(

                correctJP,

                candidateJP

            ) * 10;

    }

    // Kana -> Kanji

    if (direction === "jp_kanji") {

        const correctKanji = normalize(

            correct.kanji

        );

        const candidateKanji = normalize(

            candidate.kanji

        );

        const lengthDifference = Math.abs(

            toChars(correctKanji).length -

            toChars(candidateKanji).length

        );

        if (lengthDifference === 0) {

            score += 35;

        }

        score +=

            commonCharacters(

                correctKanji,

                candidateKanji

            ) * 15;

    }

    return score;

};

/* =====================================================

   QUIZ - PREVENT AMBIGUOUS ANSWERS

===================================================== */

const isAmbiguousAnswer = (

    correct,

    candidate,

    direction

) => {

    const correctJP = getJP(correct);

    const candidateJP = getJP(candidate);

    const correctMeaning = normalizeKey(

        correct.meaning

    );

    const candidateMeaning = normalizeKey(

        candidate.meaning

    );

    const correctKanji = normalize(

        correct.kanji

    );

    const candidateKanji = normalize(

        candidate.kanji

    );

    // Kana -> Kanji:

    // cùng cách đọc có thể có nhiều Kanji đúng

    if (direction === "jp_kanji") {

        return correctJP === candidateJP;

    }

    // Kanji -> Kana:

    // cùng Kanji có thể có nhiều cách đọc

    if (direction === "kanji") {

        return (

            correctKanji &&

            correctKanji === candidateKanji

        );

    }

    // Việt -> Nhật:

    // cùng nghĩa có thể có nhiều từ Nhật đúng

    if (direction === "vi_jp") {

        return correctMeaning === candidateMeaning;

    }

    // Nhật -> Việt:

    // cùng cách đọc có thể có nhiều nghĩa

    if (direction === "jp_vi") {

        return correctJP === candidateJP;

    }

    return false;

};

/* =====================================================

   QUIZ - SELECT DISTRACTORS

===================================================== */


/**
 * Chấm điểm sơ bộ, không dùng Edit Distance.
 * Mục đích: lọc nhanh ứng viên trước khi tính toán chi tiết.
 */
const quickDistractorScore = (correct, candidate, direction) => {
    const correctAnswer = getQuizAnswer(correct, direction);
    const candidateAnswer = getQuizAnswer(candidate, direction);

    if (
        !candidateAnswer ||
        normalizeKey(correctAnswer) === normalizeKey(candidateAnswer)
    ) {
        return -Infinity;
    }

    let score = 0;

    const lenA = toChars(correctAnswer).length;
    const lenB = toChars(candidateAnswer).length;
    const diff = Math.abs(lenA - lenB);

    // Độ dài
    if (diff === 0) score += 50;
    else if (diff === 1) score += 20;
    else if (diff === 2) score += 5;

    // Ký tự chung
    score += commonCharacters(correctAnswer, candidateAnswer) * 12;
    score += commonPrefix(correctAnswer, candidateAnswer) * 10;
    score += commonSuffix(correctAnswer, candidateAnswer) * 8;

    // Cùng loại từ
    if (
        correct.partOfSpeech &&
        correct.partOfSpeech === candidate.partOfSpeech
    ) {
        score += 18;
    }

    // Cùng topic
    if (correct.topic && correct.topic === candidate.topic) {
        score += 8;
    }

    // Cùng N3 topic
    if (correct.n3Topic && correct.n3Topic === candidate.n3Topic) {
        score += 5;
    }

    return score;
};


/**
 * Chọn đáp án nhiễu tối ưu.
 * Chỉ tính Edit Distance cho nhóm ứng viên tiềm năng.
 */
const selectDistractors = (
    correct,
    pool,
    direction,
    count = 3
) => {
    const correctId = String(correct._id);
    const correctAnswer = getQuizAnswer(correct, direction);

    const candidates = [];

    // BƯỚC 1: Lọc nhanh toàn bộ ứng viên
    for (const candidate of pool) {
        if (String(candidate._id) === correctId) continue;

        if (isAmbiguousAnswer(correct, candidate, direction)) {
            continue;
        }

        const answer = getQuizAnswer(candidate, direction);

        if (
            !answer ||
            normalizeKey(answer) === normalizeKey(correctAnswer)
        ) {
            continue;
        }

        const quickScore = quickDistractorScore(
            correct,
            candidate,
            direction
        );

        if (!Number.isFinite(quickScore)) continue;

        candidates.push({
            candidate,
            answer,
            quickScore,
        });
    }

    // BƯỚC 2: Chỉ giữ 60 ứng viên tốt nhất
    candidates.sort(
        (a, b) => b.quickScore - a.quickScore
    );

    const shortlist = candidates.slice(0, 60);

    // BƯỚC 3: Tính Edit Distance cho shortlist
    const ranked = shortlist.map((item) => ({
        answer: item.answer,
        score: scoreDistractor(
            correct,
            item.candidate,
            direction
        ),
    }));

    // BƯỚC 4: Loại đáp án trùng
    const unique = new Map();

    for (const item of ranked) {
        const key = normalizeKey(item.answer);
        const existing = unique.get(key);

        if (!existing || item.score > existing.score) {
            unique.set(key, item);
        }
    }

    // BƯỚC 5: Chọn nhóm tốt nhất
    const topCandidates = [...unique.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(count * 4, 12));

    // BƯỚC 6: Ngẫu nhiên nhẹ
    return shuffle(topCandidates)
        .map((item) => ({
            ...item,
            adjustedScore: item.score + Math.random() * 12,
        }))
        .sort((a, b) => b.adjustedScore - a.adjustedScore)
        .slice(0, count)
        .map((item) => item.answer);
};


/* =====================================================

   QUIZ - LOAD FULL DATABASE POOL

===================================================== */

const loadQuizDistractorPool = async () => {

    return Vocabulary.find({})

        .select(

            "_id kanji hiragana katakana " +

            "defaultScript romaji meaning " +

            "partOfSpeech topic n3Topic image"

        )

        .lean();

};

/* =====================================================

   QUIZ - BUILD QUESTIONS

===================================================== */

const buildQuizChoice = (

    vocabs,

    directions,

    distractorPool

) => {

    const questions = [];

    for (const v of vocabs) {

        for (const direction of directions) {

            const question = getQuizQuestion(

                v,

                direction

            );

            const correct = getQuizAnswer(

                v,

                direction

            );

            if (!question || !correct) {

                continue;

            }

            // Hai hướng Kanji bắt buộc có Kanji

            if (

                ["kanji", "jp_kanji"].includes(direction) &&

                !normalize(v.kanji)

            ) {

                continue;

            }

            const wrongAnswers = selectDistractors(

                v,

                distractorPool,

                direction,

                3

            );

            // Chỉ tạo câu khi có đủ 3 đáp án nhiễu

            if (wrongAnswers.length !== 3) {

                continue;

            }

            const choices = shuffle([

                correct,

                ...wrongAnswers,

            ]);

            questions.push({

                id: v._id,

                direction,

                question,

                correct,

                choices,

                partOfSpeech: v.partOfSpeech,

                topic: v.topic,

                kanji: v.kanji || null,

                hiragana: getJP(v),

                meaning: v.meaning,

                hanViet: v.hanViet || null,

            });

        }

    }

    return {

        mode: "quiz",

        total: questions.length,

        questions: shuffle(questions),

    };

};

/* ==========================================

   TYPING REVIEW

   Việt → Nhật

   Kanji → Nhật

\========================================== */

// Chuẩn hóa chuỗi

const cleanTypingText = (value) =>

    String(value ?? "").normalize("NFKC").trim();

// Tách mỗi ký tự Kana thành một ô

const splitKanaCells = (value) =>

    Array.from(

        cleanTypingText(value).replace(/\s+/g, "")

    );

// Lấy cách đọc Kana của từ vựng

const getTypingKana = (vocab) => {

    const value = cleanTypingText(

        vocab.defaultScript === "katakana"

            ? vocab.katakana || vocab.hiragana

            : vocab.hiragana || vocab.katakana

    );

    // Chỉ chấp nhận Hiragana / Katakana

    if (

        !value ||

        !/^[\u3040-\u30ff\u31f0-\u31ffー\s]+$/u.test(value)

    ) {

        return "";

    }

    return value;

};

// Tạo câu hỏi điền từ

const buildTyping = (vocabs, directions) => {

    const questions = [];

    for (const vocab of vocabs) {

        const answer = getTypingKana(vocab);

        if (!answer) continue;

        const answerCells = splitKanaCells(answer);

        if (!answerCells.length) continue;

        for (const direction of directions) {

            let question = "";

            // Việt → Nhật

            if (direction === "vi_jp") {

                question = cleanTypingText(vocab.meaning);

            }

            // Kanji → Nhật

            if (direction === "kanji") {

                question = cleanTypingText(vocab.kanji);

            }

            if (!question) continue;

            questions.push({

                id: String(vocab._id),

                direction,

                question,

                answer,

                correct: answer,

                // Frontend tạo ô vuông từ mảng này

                answerCells,

                cellCount: answerCells.length,

                meaning: vocab.meaning || "",

                kanji: vocab.kanji || "",

                hiragana: vocab.hiragana || "",

                katakana: vocab.katakana || "",

            });

        }

    }

    return {

        mode: "typing",

        total: questions.length,

        questions: shuffle(questions),

    };

};

/* =====================================================

   REVIEW SESSION SERVICE

===================================================== */

/* =====================================================

   REVIEW SESSION SERVICE

===================================================== */

export const createReviewSession = async (params) => {

    const {

        reviewId = "",

        lessons = "",

        topics = "",

        units = "",

        n3Topics = "",

        partsOfSpeech = "",

        mode = "flashcard",

        directions = "jp_vi",

        limit = "",

    } = params;

    let history = null;

    let isNewSession = false;

    let lessonArr = [];

    let topicArr = [];

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

        } catch {

            return {

                error: "Config của review session không hợp lệ",

            };

        }

        lessonArr = parseNumbers(savedConfig.lessons);

        topicArr = parseStrings(savedConfig.topics);

        unitArr = parseNumbers(savedConfig.units);

        n3TopicArr = parseStrings(savedConfig.n3Topics);

        partOfSpeechArr = parseStrings(

            savedConfig.partsOfSpeech

        );

        directionArr = parseStrings(

            savedConfig.directions

        );

        currentMode = savedConfig.mode || "flashcard";

        reviewLimit =

            savedConfig.limit !== undefined

                ? parseLimit(savedConfig.limit)

                : parseLimit(limit);

    } else {

        /* =========================

           NEW SESSION

        ========================= */

        lessonArr = parseNumbers(lessons);

        topicArr = parseStrings(topics).map(

            (x) => x.toLowerCase()

        );

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

    /* =========================

       VALIDATE DIRECTIONS

    ========================= */

    const validDirections = [

        "jp_vi",

        "vi_jp",

        "kanji",

        "jp_kanji",

        "image",

    ];

    if (!directionArr.length) {

        return {

            error: "Chưa chọn hướng ôn tập",

        };

    }

    if (

        directionArr.some(

            (dir) => !validDirections.includes(dir)

        )

    ) {

        return {

            error: "Hướng ôn tập không hợp lệ",

        };

    }

    // Typing chỉ hỗ trợ Việt → Nhật và Kanji → Nhật

    if (

        currentMode === "typing" &&

        directionArr.some(

            (direction) =>

                !["vi_jp", "kanji"].includes(direction)

        )

    ) {

        return {

            error:

                "Điền từ chỉ hỗ trợ Việt → Nhật và Kanji → Nhật",

        };

    }

    /* =========================

       BUILD FILTER

    ========================= */

    const conditions = [];

    if (lessonArr.length > 0) {

        conditions.push({

            lesson: {

                $in: lessonArr,

            },

        });

    }

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

    if (unitArr.length > 0) {

        conditions.push({

            unit: {

                $in: unitArr,

            },

        });

    }

    if (n3TopicArr.length > 0) {

        conditions.push({

            n3Topic: {

                $in: n3TopicArr,

            },

        });

    }

    if (partOfSpeechArr.length > 0) {

        conditions.push({

            partOfSpeech: {

                $in: partOfSpeechArr,

            },

        });

    }

    if (conditions.length === 0) {

        return {

            error: "Chưa chọn phạm vi từ vựng để ôn tập",

        };

    }

    const query =

        conditions.length === 1

            ? conditions[0]

            : {

                $or: conditions,

            };

    /* =========================

       CREATE HISTORY

    ========================= */

    if (!history) {

        const configKey = JSON.stringify({

            lessons: [...lessonArr].sort(

                (a, b) => a - b

            ),

            topics: [...topicArr].sort(),

            units: [...unitArr].sort(

                (a, b) => a - b

            ),

            n3Topics: [...n3TopicArr].sort(),

            partsOfSpeech: [

                ...partOfSpeechArr,

            ].sort(),

            mode: currentMode,

            directions: [

                ...directionArr,

            ].sort(),

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

    const allVocabs = await Vocabulary.find(

        query

    )

        .select("_id")

        .lean();

    const allIds = allVocabs.map(

        (vocab) => vocab._id

    );

    const totalVocabs = allIds.length;

    /* =========================

       REVIEWED VOCABS

    ========================= */

    const reviewedSet = new Set(

        (history.vocabIds || []).map(

            (id) => id.toString()

        )

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

       LOAD VOCABS

    ========================= */

    const vocabs = await Vocabulary.find({

        _id: {

            $in: selectedIds,

        },

    }).lean();

    const vocabMap = new Map(

        vocabs.map((vocab) => [

            vocab._id.toString(),

            vocab,

        ])

    );

    const orderedVocabs = selectedIds

        .map((id) =>

            vocabMap.get(id.toString())

        )

        .filter(Boolean);

    /* =========================

       BUILD REVIEW DATA

    ========================= */

    let data;

    switch (currentMode) {

        /* =====================

           FLASHCARD

        ===================== */

        case "flashcard": {

            data = buildFlashcards(

                orderedVocabs,

                directionArr

            );

            break;

        }

        /* =====================

           QUIZ

        ===================== */

        case "quiz": {

            // Toàn bộ kho từ vựng được sử dụng

            // để tìm đáp án nhiễu phù hợp

            const distractorPool =

                await loadQuizDistractorPool();

            data = buildQuizChoice(

                orderedVocabs,

                directionArr,

                distractorPool

            );

            break;

        }

        /* =====================

           TYPING

        ===================== */

        case "typing": {

            data = buildTyping(

                orderedVocabs,

                directionArr

            );

            break;

        }

        default: {

            return {

                error: "Mode không hợp lệ",

            };

        }

    }

    /* =========================

       SAVE SELECTED VOCABS

    ========================= */

    if (orderedVocabs.length > 0) {

        history.vocabIds.push(

            ...orderedVocabs.map(

                (vocab) => vocab._id

            )

        );

        history.updatedAt = new Date();

        await history.save();

    }

    /* =========================

       PROGRESS

    ========================= */

    const reviewedVocabs =

        history.vocabIds.length;

    const remaining = Math.max(

        0,

        totalVocabs - reviewedVocabs

    );

    /* =========================

       RETURN RESULT

    ========================= */

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

/* =====================================================

   COMPLETE REVIEW VOCAB

===================================================== */

export const completeReviewVocab = async (

    reviewId,

    vocabId

) => {

    const history =

        await ReviewHistory.findById(reviewId);

    if (!history) {

        return null;

    }

    history.vocabIds = history.vocabIds.filter(

        (id) =>

            id.toString() !== vocabId.toString()

    );

    history.updatedAt = new Date();

    await history.save();

    return {

        reviewId: history._id,

        remaining: history.vocabIds.length,

        completed:

            history.vocabIds.length === 0,

    };

};
