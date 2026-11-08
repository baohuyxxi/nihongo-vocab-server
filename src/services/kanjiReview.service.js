
import mongoose from "mongoose";

import Kanji from "../models/Kanji.js";
import KanjiCurriculumEntry from "../models/KanjiCurriculumEntry.js";
import KanjiReviewHistory from "../models/KanjiReviewHistory.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";

import { shuffle } from "../utils/shuffle.js";

// ==========================================
// CONSTANTS
// ==========================================

export const REVIEW_CURRICULUM = "sou-matome-n3-kanji";

const VALID_DIRECTIONS = [
  "kanji",
  "kanji_meaning",
  "meaning_kanji",
  "onyomi",
  "kunyomi",
  "hanviet",
  "kanji_reading",
  "reading_kanji",
  "vocab_meaning",
  "meaning_vocab",
];

const ALLOWED_DIRECTIONS = {
  kanji: [
    "kanji",
    "kanji_meaning",
    "meaning_kanji",
    "onyomi",
    "kunyomi",
    "hanviet",
  ],
  vocabulary: [
    "kanji",
    "kanji_reading",
    "reading_kanji",
    "vocab_meaning",
    "meaning_vocab",
  ],
};

// ==========================================
// HELPERS
// ==========================================

const throwError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const asString = (value) => String(value ?? "").trim();

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [value];
};

const unique = (items) => [
  ...new Set(items.filter(Boolean)),
];

const asReadings = (values) => {
  return unique(
    asArray(values).map((value) => {
      if (typeof value === "object" && value !== null) {
        return asString(value.reading ?? value.value);
      }
      return asString(value);
    })
  );
};

const asMeanings = (values) => {
  return unique(asArray(values).map(asString));
};

const normalizeItemId = (value) => {
  const id = asString(value);

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !/^[a-f\d]{24}$/i.test(id)
  ) {
    return null;
  }

  return id;
};

const normalizeSelectionEntry = (item) => {
  if (!item || typeof item !== "object") return null;

  const itemType = item.itemType;
  const itemId = normalizeItemId(
    item.itemId ?? item._id ?? item.id
  );

  if (
    !["kanji", "vocabulary"].includes(itemType) ||
    !itemId
  ) {
    return null;
  }

  return { itemType, itemId };
};

const sanitizeSelectionList = (items = []) => {
  return asArray(items)
    .map(normalizeSelectionEntry)
    .filter(Boolean);
};

const selectionKey = ({ itemType, itemId }) => {
  return `${itemType}:${itemId}`;
};

const uniqueSelections = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = selectionKey(item);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

// ==========================================
// PARSE SCOPE
// ==========================================

const parseCsvNumberList = (value, min, max, label) => {
  if (value === undefined || value === null || value === "") {
    throwError(`Review scope requires ${label}`, 400);
  }

  const parts = asArray(value).flatMap((v) =>
    String(v).split(",")
  );

  const numbers = parts.map((part) =>
    Number(part.trim())
  );

  if (
    !numbers.length ||
    numbers.some(
      (n) =>
        !Number.isInteger(n) ||
        n < min ||
        n > max
    )
  ) {
    throwError(
      `${label} values must be integers between ${min} and ${max}`,
      400
    );
  }

  return unique(numbers).sort((a, b) => a - b);
};

export const parseReviewScope = (query = {}) => {
  const curriculum = asString(
    query.curriculum || REVIEW_CURRICULUM
  );

  if (curriculum !== REVIEW_CURRICULUM) {
    throwError(
      "Unsupported curriculum. Only sou-matome-n3-kanji is allowed.",
      400
    );
  }

  const weeks = parseCsvNumberList(
    query.weeks ?? query.week,
    1,
    6,
    "weeks"
  );

  const days = parseCsvNumberList(
    query.days ?? query.day,
    1,
    7,
    "days"
  );

  const contentType = query.contentType ?? "both";
  const mode = query.mode ?? "flashcard";

  if (!["kanji", "vocabulary", "both"].includes(contentType)) {
    throwError("Invalid contentType", 400);
  }

  if (!["flashcard", "quiz", "typing"].includes(mode)) {
    throwError("Invalid mode", 400);
  }

  const requestedDirections = asArray(query.directions)
    .flatMap((v) => String(v).split(","))
    .map(asString)
    .filter(Boolean);

  const directions = unique(
    requestedDirections.length
      ? requestedDirections
      : ["kanji"]
  );

  if (
    directions.some(
      (direction) => !VALID_DIRECTIONS.includes(direction)
    )
  ) {
    throwError("Invalid review direction", 400);
  }

  // Không truyền limit = ôn tất cả
  const rawLimit = query.limit;

  const limit =
    rawLimit === undefined ||
    rawLimit === null ||
    rawLimit === "" ||
    rawLimit === "null"
      ? null
      : Number(rawLimit);

  if (
    limit !== null &&
    (!Number.isSafeInteger(limit) || limit <= 0)
  ) {
    throwError(
      "limit must be a positive integer or omitted for all",
      400
    );
  }

  return {
    curriculum,
    weeks,
    days,
    contentType,
    mode,
    directions,
    limit,
  };
};

// ==========================================
// NORMALIZE TYPING
// ==========================================

export const normalizeTypingAnswer = (value = "") => {
  return asString(value)
    .replace(/[\s\u3000]+/g, "")
    .replace(/[。．・.]/g, "")
    .replace(/[ァ-ヶ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
};

// ==========================================
// NORMALIZE KANJI
// ==========================================

const getKanjiItemData = (item) => {
  // FIX: hỗ trợ cả MongoDB document
  // và item đã được normalize.
  const kanji = asString(item.kanji || item.front);

  return {
    itemType: "kanji",
    itemId: item.itemId ?? item._id ?? item.id,
    front: kanji,
    kanji,
    meanings: asMeanings(
      item.meanings?.length
        ? item.meanings
        : item.meaning
    ),
    onyomi: asReadings(item.onyomi),
    kunyomi: asReadings(item.kunyomi),
    hanViet: asMeanings(item.hanViet),
  };
};

// ==========================================
// NORMALIZE VOCABULARY
// ==========================================

const getVocabularyItemData = (item) => {
  const word = asString(
    item.word || item.kanji || item.front
  );

  return {
    itemType: "vocabulary",
    itemId: item.itemId ?? item._id ?? item.id,
    front: word,
    word,
    meaning: asString(item.meaning),
    hiragana: asString(item.hiragana),
    hanViet: asString(item.hanViet),
    readings: asReadings(item.readings),
  };
};

// ==========================================
// DIRECTIONS
// ==========================================

const itemSupportsDirection = (itemType, direction) => {
  return (
    ALLOWED_DIRECTIONS[itemType]?.includes(direction) ??
    false
  );
};

const resolveDirection = (
  itemType,
  directions,
  mode
) => {
  // "kanji" là chế độ hiển thị Flashcard tổng hợp.
  if (
    mode !== "flashcard" &&
    directions.includes("kanji")
  ) {
    throwError(
      "Direction 'kanji' is only supported in flashcard mode",
      400
    );
  }

  return (
    directions.find((direction) =>
      itemSupportsDirection(itemType, direction)
    ) || null
  );
};

// ==========================================
// ANSWERS
// ==========================================

const getAnswerSet = (item, direction) => {
  const data =
    item.itemType === "kanji"
      ? getKanjiItemData(item)
      : getVocabularyItemData(item);

  switch (direction) {
    case "kanji":
      return [data.kanji || data.word].filter(Boolean);

    case "kanji_meaning":
      return data.meanings ?? [];

    case "meaning_kanji":
      return [data.kanji].filter(Boolean);

    case "onyomi":
      return data.onyomi ?? [];

    case "kunyomi":
      return data.kunyomi ?? [];

    case "hanviet":
      return asMeanings(data.hanViet);

    case "kanji_reading":
      return [data.hiragana].filter(Boolean);

    case "reading_kanji":
      return [data.word].filter(Boolean);

    case "vocab_meaning":
      return [data.meaning].filter(Boolean);

    case "meaning_vocab":
      return [data.word].filter(Boolean);

    default:
      return [];
  }
};

// ==========================================
// QUESTION FRONT
// ==========================================

const buildQuestionFront = (item, direction) => {
  const data =
    item.itemType === "kanji"
      ? getKanjiItemData(item)
      : getVocabularyItemData(item);

  switch (direction) {
    case "kanji":
    case "kanji_meaning":
    case "onyomi":
    case "kunyomi":
    case "hanviet":
      return data.kanji || data.word || "";

    case "meaning_kanji":
      return data.meanings?.join(" / ") || "";

    case "kanji_reading":
    case "vocab_meaning":
      return data.word || "";

    case "reading_kanji":
      return data.hiragana || "";

    case "meaning_vocab":
      return data.meaning || "";

    default:
      return "";
  }
};

// ==========================================
// FLASHCARD BACK
// ==========================================

const buildKanjiFlashcardBack = (item) => {
  return {
    kanji: asString(item.kanji || item.front),
    hanViet: asMeanings(item.hanViet).join(", "),
    onyomi: asReadings(item.onyomi),
    kunyomi: asReadings(item.kunyomi),
    meaning: asMeanings(
      item.meanings?.length
        ? item.meanings
        : item.meaning
    ).join("; "),
  };
};

const buildVocabularyFlashcardBack = (item) => {
  return {
    word: asString(item.word || item.front),
    hanViet: asString(item.hanViet),
    hiragana: asString(item.hiragana),
    meaning: asString(item.meaning),
  };
};

// ==========================================
// BUILD FLASHCARDS
// ==========================================

export const buildFlashcardItems = (
  items = [],
  directions = ["kanji"]
) => {
  const cards = [];

  for (const item of items) {
    const itemType =
      item.itemType ||
      (item.kanji ? "kanji" : "vocabulary");

    const data =
      itemType === "kanji"
        ? getKanjiItemData(item)
        : getVocabularyItemData(item);

    const itemId = normalizeItemId(data.itemId);

    const direction = resolveDirection(
      itemType,
      directions,
      "flashcard"
    );

    if (!itemId || !data.front || !direction) {
      continue;
    }

    const front = buildQuestionFront(
      data,
      direction
    );

    if (!front) continue;

    const back =
      itemType === "kanji"
        ? buildKanjiFlashcardBack(data)
        : buildVocabularyFlashcardBack(data);

    cards.push({
      id: `${itemType}-${itemId}-${direction}`,
      itemType,
      itemId,
      direction,
      front,
      back,
    });
  }

  return cards;
};

// ==========================================
// QUIZ DISTRACTORS
// ==========================================

const buildDistractors = (
  itemType,
  direction,
  items
) => {
  return unique(
    items
      .filter((item) => item.itemType === itemType)
      .flatMap((item) =>
        getAnswerSet(item, direction)
      )
  );
};

// ==========================================
// BUILD QUIZ
// ==========================================

export const buildQuizQuestions = (
  items = [],
  directions = []
) => {
  const questions = [];

  for (const item of items) {
    const itemType = item.itemType;

    const direction = resolveDirection(
      itemType,
      directions,
      "quiz"
    );

    if (!direction) continue;

    const data =
      itemType === "kanji"
        ? getKanjiItemData(item)
        : getVocabularyItemData(item);

    const itemId = normalizeItemId(data.itemId);

    const question = buildQuestionFront(
      data,
      direction
    );

    const acceptedAnswers = unique(
      getAnswerSet(data, direction)
    );

    if (
      !itemId ||
      !question ||
      !acceptedAnswers.length
    ) {
      continue;
    }

    const correct = acceptedAnswers[0];

    const distractors = shuffle(
      buildDistractors(
        itemType,
        direction,
        items
      ).filter(
        (answer) =>
          !acceptedAnswers.includes(answer)
      )
    );

    if (distractors.length < 3) {
      continue;
    }

    questions.push({
      id: `${itemType}-${itemId}-${direction}`,
      itemType,
      itemId,
      direction,
      question,
      correct,
      acceptedAnswers,
      choices: shuffle([
        correct,
        ...distractors.slice(0, 3),
      ]),
    });
  }

  return questions;
};

// ==========================================
// BUILD TYPING
// ==========================================

export const buildTypingQuestions = (
  items = [],
  directions = []
) => {
  const questions = [];

  for (const item of items) {
    const itemType = item.itemType;

    const direction = resolveDirection(
      itemType,
      directions,
      "typing"
    );

    if (!direction) continue;

    const data =
      itemType === "kanji"
        ? getKanjiItemData(item)
        : getVocabularyItemData(item);

    const itemId = normalizeItemId(data.itemId);

    const question = buildQuestionFront(
      data,
      direction
    );

    const acceptedAnswers = unique(
      getAnswerSet(data, direction).map(
        normalizeTypingAnswer
      )
    );

    if (
      !itemId ||
      !question ||
      !acceptedAnswers.length
    ) {
      continue;
    }

    questions.push({
      id: `${itemType}-${itemId}-${direction}`,
      itemType,
      itemId,
      direction,
      question,
      correct: acceptedAnswers[0],
      acceptedAnswers,
    });
  }

  return questions;
};

// ==========================================
// LOAD DOCUMENTS
// ==========================================

const buildItemDocumentMap = async (items) => {
  const kanjiIds = items
    .filter((item) => item.itemType === "kanji")
    .map((item) => item.itemId);

  const vocabularyIds = items
    .filter((item) => item.itemType === "vocabulary")
    .map((item) => item.itemId);

  const [
    kanjiDocuments,
    vocabularyDocuments,
  ] = await Promise.all([
    kanjiIds.length
      ? Kanji.find({
          _id: { $in: kanjiIds },
        }).lean()
      : [],

    vocabularyIds.length
      ? KanjiVocabulary.find({
          _id: { $in: vocabularyIds },
        }).lean()
      : [],
  ]);

  return {
    kanjiMap: new Map(
      kanjiDocuments.map((entry) => [
        String(entry._id),
        entry,
      ])
    ),

    vocabularyMap: new Map(
      vocabularyDocuments.map((entry) => [
        String(entry._id),
        entry,
      ])
    ),
  };
};

// ==========================================
// RESOLVE CURRICULUM ITEMS
// ==========================================

export const resolveSelectedCurriculumItems = async (
  scope
) => {
  const entries = await KanjiCurriculumEntry.find({
    curriculum: scope.curriculum,
    week: { $in: scope.weeks },
    day: { $in: scope.days },
  })
    .populate("kanjiId")
    .populate("vocabularyIds")
    .sort({
      week: 1,
      day: 1,
      order: 1,
    })
    .lean();

  const selected = [];

  for (const entry of entries) {
    // Kanji chính
    if (
      ["kanji", "both"].includes(scope.contentType) &&
      entry.kanjiId?._id
    ) {
      selected.push({
        itemType: "kanji",
        itemId: String(entry.kanjiId._id),
      });
    }

    // Từ vựng liên quan
    if (
      ["vocabulary", "both"].includes(scope.contentType)
    ) {
      for (const vocab of entry.vocabularyIds || []) {
        if (vocab?._id) {
          selected.push({
            itemType: "vocabulary",
            itemId: String(vocab._id),
          });
        }
      }
    }
  }

  // FIX: Không giới hạn 20 ở đây.
  // selectedIds phải chứa toàn bộ phạm vi.
  return uniqueSelections(selected);
};

// ==========================================
// HISTORY HELPERS
// ==========================================

const toMongoSelections = (items) => {
  return items.map(({ itemType, itemId }) => ({
    itemType,
    itemId: new mongoose.Types.ObjectId(itemId),
  }));
};

const getHistorySets = (history) => {
  const selectedIds = uniqueSelections(
    sanitizeSelectionList(history.selectedIds)
  );

  const selectedSet = new Set(
    selectedIds.map(selectionKey)
  );

  const completedIds = uniqueSelections(
    sanitizeSelectionList(history.completedIds)
  ).filter((item) =>
    selectedSet.has(selectionKey(item))
  );

  const completedSet = new Set(
    completedIds.map(selectionKey)
  );

  const remainingIds = selectedIds.filter(
    (item) =>
      !completedSet.has(selectionKey(item))
  );

  return {
    selectedIds,
    completedIds,
    remainingIds,
  };
};

// ==========================================
// CREATE REVIEW SESSION
// ==========================================

export const createReviewSession = async (
  query = {}
) => {
  const scope = parseReviewScope(query);

  // Lấy toàn bộ dữ liệu trong phạm vi
  const selectedItems =
    await resolveSelectedCurriculumItems(scope);

  if (!selectedItems.length) {
    throwError(
      "No curriculum entries matched the selected weeks and days",
      400
    );
  }

  const sessionKey = [
    scope.curriculum,
    scope.weeks.join(","),
    scope.days.join(","),
    scope.contentType,
    scope.mode,
    scope.directions.join(","),
  ].join("|");

  let history;

  // ========================================
  // FIND HISTORY
  // ========================================

  if (query.reviewId) {
    if (!normalizeItemId(query.reviewId)) {
      throwError("Invalid reviewId", 400);
    }

    history = await KanjiReviewHistory.findById(
      query.reviewId
    );

    if (!history) {
      throwError("Review session not found", 404);
    }

    if (history.sessionKey !== sessionKey) {
      throwError(
        "Review session does not match the requested curriculum scope",
        400
      );
    }
  } else {
    history = await KanjiReviewHistory.findOne({
      sessionKey,
    });
  }

  // ========================================
  // CREATE HISTORY
  // ========================================

  if (!history) {
    history = await KanjiReviewHistory.create({
      sessionKey,
      curriculum: scope.curriculum,
      weeks: scope.weeks,
      days: scope.days,
      contentType: scope.contentType,
      mode: scope.mode,
      directions: scope.directions,
      limit: scope.limit,
      selectedIds: toMongoSelections(
        selectedItems
      ),
      completedIds: [],
      remainingIds: toMongoSelections(
        selectedItems
      ),
      status: "active",
    });
  } else {
    // FIX:
    // Đồng bộ session cũ từng bị giới hạn 20.
    // Giữ lại các mục đã hoàn thành
    // nếu vẫn thuộc phạm vi hiện tại.

    const old = getHistorySets(history);

    const currentSet = new Set(
      selectedItems.map(selectionKey)
    );

    const completedIds = old.completedIds.filter(
      (item) =>
        currentSet.has(selectionKey(item))
    );

    const completedSet = new Set(
      completedIds.map(selectionKey)
    );

    const remainingIds = selectedItems.filter(
      (item) =>
        !completedSet.has(selectionKey(item))
    );

    history.selectedIds = toMongoSelections(
      selectedItems
    );

    history.completedIds = toMongoSelections(
      completedIds
    );

    history.remainingIds = toMongoSelections(
      remainingIds
    );

    history.limit = scope.limit;

    history.status = remainingIds.length
      ? "active"
      : "completed";

    await history.save();
  }

  // ========================================
  // GET REMAINING
  // ========================================

  const record = getHistorySets(history);

  // FIX:
  // null = lấy tất cả
  // number = giới hạn lượt ôn
  const itemsToRender =
    scope.limit === null
      ? record.remainingIds
      : record.remainingIds.slice(
          0,
          scope.limit
        );

  // ========================================
  // LOAD MONGODB DOCUMENTS
  // ========================================

  const itemMaps = await buildItemDocumentMap(
    itemsToRender
  );

  const renderedItems = itemsToRender
    .map((item) => {
      const document =
        item.itemType === "kanji"
          ? itemMaps.kanjiMap.get(item.itemId)
          : itemMaps.vocabularyMap.get(item.itemId);

      if (!document) return null;

      const data =
        item.itemType === "kanji"
          ? getKanjiItemData(document)
          : getVocabularyItemData(document);

      return {
        ...data,
        itemType: item.itemType,
        itemId: item.itemId,
      };
    })
    .filter(Boolean);

  // ========================================
  // GENERATE REVIEW DATA
  // ========================================

  const generated =
    scope.mode === "flashcard"
      ? buildFlashcardItems(
          renderedItems,
          scope.directions
        )
      : scope.mode === "quiz"
        ? buildQuizQuestions(
            renderedItems,
            scope.directions
          )
        : buildTypingQuestions(
            renderedItems,
            scope.directions
          );

  // ========================================
  // RESPONSE
  // ========================================

  return {
    mode: scope.mode,
    total: generated.length,

    data:
      scope.mode === "flashcard"
        ? {
            mode: scope.mode,
            total: generated.length,
            cards: generated,
          }
        : {
            mode: scope.mode,
            total: generated.length,
            questions: generated,
          },

    meta: {
      reviewId: String(history._id),

      progress: {
        selectedVocabs: record.selectedIds.length,
        reviewedVocabs: record.completedIds.length,
        total: record.selectedIds.length,
        remaining: record.remainingIds.length,
        completed:
          record.remainingIds.length === 0,
      },
    },
  };
};

// ==========================================
// COMPLETE REVIEW ITEM
// ==========================================

export const completeReviewSession = async (
  payload = {}
) => {
  const reviewId =
    payload.reviewId || payload.id;

  if (!normalizeItemId(reviewId)) {
    throwError(
      "Valid reviewId is required",
      400
    );
  }

  const history =
    await KanjiReviewHistory.findById(reviewId);

  if (!history) {
    throwError(
      "Review session not found",
      404
    );
  }

  const item = normalizeSelectionEntry(payload);

  if (!item) {
    throwError(
      "Valid itemType and itemId are required",
      400
    );
  }

  const record = getHistorySets(history);

  const selectedMatch = record.selectedIds.some(
    (entry) =>
      selectionKey(entry) === selectionKey(item)
  );

  if (!selectedMatch) {
    throwError(
      "Item is not part of the active review session",
      400
    );
  }

  const completedIds = uniqueSelections([
    ...record.completedIds,
    item,
  ]);

  const completedSet = new Set(
    completedIds.map(selectionKey)
  );

  const remainingIds = record.selectedIds.filter(
    (entry) =>
      !completedSet.has(selectionKey(entry))
  );

  history.completedIds = toMongoSelections(
    completedIds
  );

  history.remainingIds = toMongoSelections(
    remainingIds
  );

  history.status = remainingIds.length
    ? "active"
    : "completed";

  await history.save();

  return {
    success: true,
    message: "Review item marked as completed",

    data: {
      reviewId: String(history._id),
      itemType: item.itemType,
      itemId: item.itemId,
      completed: true,
      remaining: remainingIds.length,
      selected: record.selectedIds.length,
      reviewed: completedIds.length,
    },
  };
};
