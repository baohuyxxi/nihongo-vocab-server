import Vocabulary from "../../models/Vocabulary.js";
import ReviewHistory from "../../models/ReviewHistory.js";
import { shuffle } from "../../utils/shuffle.js";
import { parseLimit, parseNumbers, parseStrings, escapeRegex } from "./review.helpers.js";
import { buildFlashcards } from "./flashcard.service.js";
import { buildQuizChoice, loadQuizDistractorPool } from "./quiz.service.js";
import { buildTyping } from "./typing.service.js";

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
            data = await buildQuizChoice(
                orderedVocabs,
                directionArr
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
