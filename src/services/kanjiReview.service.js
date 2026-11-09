
import mongoose from "mongoose";

import Kanji from "../models/Kanji.js";
import KanjiCurriculumEntry from "../models/KanjiCurriculumEntry.js";
import KanjiReviewHistory from "../models/KanjiReviewHistory.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";

import { shuffle } from "../utils/shuffle.js";

export const REVIEW_CURRICULUM = "sou-matome-n3-kanji";

const VALID_DIRECTIONS = [
  "jp_vi",
  "vi_jp",
  "kanji",
  "image",
];

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const str = (value) => String(value ?? "").trim();

const array = (value) => {
  if (Array.isArray(value)) return value;
  return value == null || value === "" ? [] : [value];
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const readings = (value) =>
  unique(
    array(value).map((entry) =>
      str(
        entry && typeof entry === "object"
          ? entry.reading ?? entry.value
          : entry
      )
    )
  );

const meanings = (value) =>
  unique(array(value).map(str));

const objectId = (value) => {
  const id = str(value);
  return /^[a-f\d]{24}$/i.test(id) ? id : null;
};

const normalizeSelection = (value) => {
  if (!value) return null;

  const itemType = value.itemType;
  const itemId = objectId(
    value.itemId ?? value._id ?? value.id
  );

  if (
    !["kanji", "vocabulary"].includes(itemType) ||
    !itemId
  ) {
    return null;
  }

  return { itemType, itemId };
};

const selectionKey = (item) =>
  `${item.itemType}:${item.itemId}`;

const cleanSelections = (values) => {
  const seen = new Set();

  return array(values)
    .map(normalizeSelection)
    .filter((item) => {
      if (!item) return false;

      const key = selectionKey(item);
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
};

const mongoSelections = (items) =>
  items.map(({ itemType, itemId }) => ({
    itemType,
    itemId: new mongoose.Types.ObjectId(itemId),
  }));

const parseNumbers = (value, min, max, label) => {
  if (value == null || value === "") {
    fail(`${label} is required`);
  }

  const numbers = array(value)
    .flatMap((v) => String(v).split(","))
    .map((v) => Number(v.trim()));

  if (
    !numbers.length ||
    numbers.some(
      (v) => !Number.isInteger(v) || v < min || v > max
    )
  ) {
    fail(`Invalid ${label}`);
  }

  return unique(numbers).sort((a, b) => a - b);
};

// ==========================================
// SCOPE
// ==========================================

export const parseReviewScope = (query = {}) => {
  const curriculum = str(
    query.curriculum || REVIEW_CURRICULUM
  );

  if (curriculum !== REVIEW_CURRICULUM) {
    fail("Unsupported curriculum");
  }

  const weeks = parseNumbers(
    query.weeks ?? query.week,
    1,
    6,
    "weeks"
  );

  const days = parseNumbers(
    query.days ?? query.day,
    1,
    7,
    "days"
  );

  const contentType = query.contentType || "both";
  const mode = query.mode || "flashcard";

  if (!["kanji", "vocabulary", "both"].includes(contentType)) {
    fail("Invalid contentType");
  }

  if (!["flashcard", "quiz", "typing"].includes(mode)) {
    fail("Invalid mode");
  }

  const directions = unique(
    array(query.directions)
      .flatMap((v) => String(v).split(","))
      .map(str)
      .filter(Boolean)
  );

  if (!directions.length) {
    directions.push("kanji");
  }

  if (directions.some((v) => !VALID_DIRECTIONS.includes(v))) {
    fail("Invalid review direction");
  }

  const rawLimit = query.limit;

  const limit =
    rawLimit == null ||
    rawLimit === "" ||
    rawLimit === "null"
      ? null
      : Number(rawLimit);

  if (
    limit !== null &&
    (!Number.isSafeInteger(limit) || limit <= 0)
  ) {
    fail("Invalid limit");
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
// NORMALIZE ITEMS
// ==========================================

const getKanjiItemData = (item) => {
  const kanji = str(item.kanji || item.front);

  return {
    itemType: "kanji",
    itemId: item.itemId ?? item._id ?? item.id,
    front: kanji,
    kanji,
    meanings: meanings(
      item.meanings?.length
        ? item.meanings
        : item.meaning
    ),
    onyomi: readings(item.onyomi),
    kunyomi: readings(item.kunyomi),
    hanViet: meanings(item.hanViet),
    image: str(item.image?.url || item.image),
  };
};

const getVocabularyItemData = (item) => {
  const word = str(
    item.word || item.kanji || item.front
  );

  return {
    itemType: "vocabulary",
    itemId: item.itemId ?? item._id ?? item.id,
    front: word,
    word,
    hiragana: str(item.hiragana),
    meaning: str(item.meaning),
    hanViet: str(item.hanViet),
    readings: readings(item.readings),
    image: str(item.image?.url || item.image),
  };
};

const normalizeItem = (item) =>
  item.itemType === "kanji"
    ? getKanjiItemData(item)
    : getVocabularyItemData(item);

const japaneseOf = (item) =>
  item.itemType === "kanji"
    ? item.kanji
    : item.word;

const meaningOf = (item) =>
  item.itemType === "kanji"
    ? item.meanings.join(" / ")
    : item.meaning;

// ==========================================
// DIRECTIONS
// ==========================================

const questionFront = (item, direction) => {
  switch (direction) {
    case "jp_vi":
    case "kanji":
      return japaneseOf(item);

    case "vi_jp":
      return meaningOf(item);

    case "image":
      return item.image;

    default:
      return "";
  }
};

const answersFor = (item, direction) => {
  switch (direction) {
    case "jp_vi":
      return meanings(meaningOf(item));

    case "vi_jp":
    case "image":
      return [japaneseOf(item)].filter(Boolean);

    // Kanji là hướng hiển thị tổng hợp.
    // Quiz/Typing dùng chữ Kanji làm đáp án.
    case "kanji":
      return [japaneseOf(item)].filter(Boolean);

    default:
      return [];
  }
};

const kanjiBack = (item) => ({
  kanji: item.kanji,
  hanViet: item.hanViet.join(", "),
  onyomi: item.onyomi,
  kunyomi: item.kunyomi,
  meaning: item.meanings.join("; "),
});

const vocabularyBack = (item) => ({
  word: item.word,
  hanViet: item.hanViet,
  hiragana: item.hiragana,
  meaning: item.meaning,
});

const fullBack = (item) =>
  item.itemType === "kanji"
    ? kanjiBack(item)
    : vocabularyBack(item);

const flashcardBack = (item, direction) => {
  const full = fullBack(item);

  if (direction === "kanji") {
    return full;
  }

  if (direction === "jp_vi") {
    return {
      ...full,
      jp: japaneseOf(item),
      vi: meaningOf(item),
      meaning: meaningOf(item),
    };
  }

  if (direction === "vi_jp") {
    return {
      ...full,
      jp: japaneseOf(item),
      vi: meaningOf(item),
    };
  }

  if (direction === "image") {
    return {
      ...full,
      jp: japaneseOf(item),
      vi: meaningOf(item),
      image: item.image,
    };
  }

  return full;
};

const validQuestion = (item, direction, mode) => {
  const front = questionFront(item, direction);
  const answers = answersFor(item, direction);

  if (!front || !answers.length) return false;

  // Không hỏi chính chữ Kanji rồi yêu cầu
  // nhập lại cùng chữ đó.
  if (mode !== "flashcard" && direction === "kanji") {
    return false;
  }

  return true;
};

const pickDirection = (item, directions, mode) =>
  directions.find((direction) =>
    validQuestion(item, direction, mode)
  ) || null;

// ==========================================
// FLASHCARDS
// ==========================================

export const buildFlashcardItems = (
  items = [],
  directions = ["kanji"]
) => {
  const cards = [];

  for (const source of items) {
    const item = normalizeItem(source);
    const itemId = objectId(item.itemId);

    if (!itemId) continue;

    const direction = pickDirection(
      item,
      directions,
      "flashcard"
    );

    if (!direction) continue;

    cards.push({
      id: `${item.itemType}-${itemId}-${direction}`,
      itemType: item.itemType,
      itemId,
      direction,
      front: questionFront(item, direction),
      back: flashcardBack(item, direction),
    });
  }

  return cards;
};

// ==========================================
// TYPING
// ==========================================

export const normalizeTypingAnswer = (value = "") =>
  str(value)
    .replace(/[\s\u3000]+/g, "")
    .replace(/[。．・.]/g, "")
    .replace(/[ァ-ヶ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    );

export const buildTypingQuestions = (
  items = [],
  directions = ["jp_vi"]
) => {
  const questions = [];

  for (const source of items) {
    const item = normalizeItem(source);
    const itemId = objectId(item.itemId);

    if (!itemId) continue;

    const direction = pickDirection(
      item,
      directions,
      "typing"
    );

    if (!direction) continue;

    const acceptedAnswers = unique(
      answersFor(item, direction)
        .map(normalizeTypingAnswer)
        .filter(Boolean)
    );

    if (!acceptedAnswers.length) continue;

    questions.push({
      id: `${item.itemType}-${itemId}-${direction}`,
      itemType: item.itemType,
      itemId,
      direction,
      question: questionFront(item, direction),
      correct: acceptedAnswers[0],
      acceptedAnswers,
    });
  }

  return questions;
};

// ==========================================
// QUIZ
// ==========================================

export const buildQuizQuestions = (
  items = [],
  directions = ["jp_vi"]
) => {
  const normalized = items.map(normalizeItem);
  const questions = [];

  for (const item of normalized) {
    const itemId = objectId(item.itemId);

    if (!itemId) continue;

    const direction = pickDirection(
      item,
      directions,
      "quiz"
    );

    if (!direction) continue;

    const acceptedAnswers = unique(
      answersFor(item, direction)
    );

    if (!acceptedAnswers.length) continue;

    const correct = acceptedAnswers[0];

    const distractors = unique(
      normalized
        .filter(
          (candidate) =>
            candidate.itemType === item.itemType &&
            String(candidate.itemId) !== itemId
        )
        .flatMap((candidate) =>
          answersFor(candidate, direction)
        )
    ).filter(
      (answer) => !acceptedAnswers.includes(answer)
    );

    if (distractors.length < 3) continue;

    questions.push({
      id: `${item.itemType}-${itemId}-${direction}`,
      itemType: item.itemType,
      itemId,
      direction,
      question: questionFront(item, direction),
      correct,
      acceptedAnswers,
      choices: shuffle([
        correct,
        ...shuffle(distractors).slice(0, 3),
      ]),
    });
  }

  return questions;
};

// ==========================================
// CURRICULUM SELECTION
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
    .sort({ week: 1, day: 1, order: 1 })
    .lean();

  const selected = [];

  for (const entry of entries) {
    if (
      ["kanji", "both"].includes(scope.contentType) &&
      entry.kanjiId?._id
    ) {
      selected.push({
        itemType: "kanji",
        itemId: String(entry.kanjiId._id),
      });
    }

    if (
      ["vocabulary", "both"].includes(scope.contentType)
    ) {
      for (const vocab of entry.vocabularyIds || []) {
        if (!vocab?._id) continue;

        selected.push({
          itemType: "vocabulary",
          itemId: String(vocab._id),
        });
      }
    }
  }

  return cleanSelections(selected);
};

// ==========================================
// LOAD DOCUMENTS
// ==========================================

const loadDocuments = async (selections) => {
  const kanjiIds = selections
    .filter((item) => item.itemType === "kanji")
    .map((item) => item.itemId);

  const vocabIds = selections
    .filter((item) => item.itemType === "vocabulary")
    .map((item) => item.itemId);

  const [kanjiDocs, vocabDocs] = await Promise.all([
    kanjiIds.length
      ? Kanji.find({
          _id: { $in: kanjiIds },
        }).lean()
      : [],
    vocabIds.length
      ? KanjiVocabulary.find({
          _id: { $in: vocabIds },
        }).lean()
      : [],
  ]);

  const kanjiMap = new Map(
    kanjiDocs.map((item) => [String(item._id), item])
  );

  const vocabMap = new Map(
    vocabDocs.map((item) => [String(item._id), item])
  );

  return selections.flatMap((selection) => {
    const document =
      selection.itemType === "kanji"
        ? kanjiMap.get(selection.itemId)
        : vocabMap.get(selection.itemId);

    if (!document) return [];

    return [{
      ...document,
      itemType: selection.itemType,
      itemId: selection.itemId,
    }];
  });
};

// ==========================================
// HISTORY
// ==========================================

const historyState = (history) => {
  const selectedIds = cleanSelections(
    history.selectedIds
  );

  const selectedSet = new Set(
    selectedIds.map(selectionKey)
  );

  const completedIds = cleanSelections(
    history.completedIds
  ).filter((item) =>
    selectedSet.has(selectionKey(item))
  );

  const completedSet = new Set(
    completedIds.map(selectionKey)
  );

  const remainingIds = selectedIds.filter(
    (item) => !completedSet.has(selectionKey(item))
  );

  return {
    selectedIds,
    completedIds,
    remainingIds,
  };
};

const sessionKeyOf = (scope) =>
  [
    scope.curriculum,
    scope.weeks.join(","),
    scope.days.join(","),
    scope.contentType,
    scope.mode,
    scope.directions.join(","),
  ].join("|");

// ==========================================
// CREATE REVIEW SESSION
// ==========================================

export const createReviewSession = async (
  query = {}
) => {
  const scope = parseReviewScope(query);

  const selectedItems =
    await resolveSelectedCurriculumItems(scope);

  if (!selectedItems.length) {
    fail(
      "No curriculum entries matched the selected scope"
    );
  }

  const sessionKey = sessionKeyOf(scope);
  let history;

  if (query.reviewId) {
    if (!objectId(query.reviewId)) {
      fail("Invalid reviewId");
    }

    history = await KanjiReviewHistory.findById(
      query.reviewId
    );

    if (!history) {
      fail("Review session not found", 404);
    }

    // So sánh cấu hình thực tế, kể cả session cũ.
    const matches =
      history.curriculum === scope.curriculum &&
      JSON.stringify([...history.weeks].sort()) ===
        JSON.stringify([...scope.weeks].sort()) &&
      JSON.stringify([...history.days].sort()) ===
        JSON.stringify([...scope.days].sort()) &&
      history.contentType === scope.contentType &&
      history.mode === scope.mode &&
      JSON.stringify(history.directions || []) ===
        JSON.stringify(scope.directions);

    if (!matches) {
      fail("Review session scope mismatch");
    }
  } else {
    history = await KanjiReviewHistory.findOne({
      sessionKey,
    });
  }

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
      selectedIds: mongoSelections(selectedItems),
      completedIds: [],
      remainingIds: mongoSelections(selectedItems),
      status: "active",
    });
  } else {
    const old = historyState(history);

    const currentSet = new Set(
      selectedItems.map(selectionKey)
    );

    const completedIds = old.completedIds.filter(
      (item) => currentSet.has(selectionKey(item))
    );

    const completedSet = new Set(
      completedIds.map(selectionKey)
    );

    const remainingIds = selectedItems.filter(
      (item) => !completedSet.has(selectionKey(item))
    );

    history.sessionKey = sessionKey;
    history.selectedIds = mongoSelections(selectedItems);
    history.completedIds = mongoSelections(completedIds);
    history.remainingIds = mongoSelections(remainingIds);
    history.limit = scope.limit;
    history.status = remainingIds.length
      ? "active"
      : "completed";

    await history.save();
  }

  const state = historyState(history);

  // Random trước, giới hạn sau.
  const randomized = shuffle([
    ...state.remainingIds,
  ]);

  const candidates =
    scope.limit === null
      ? randomized
      : randomized.slice(0, scope.limit);

  const documents = await loadDocuments(candidates);

  const generated =
    scope.mode === "flashcard"
      ? buildFlashcardItems(
          documents,
          scope.directions
        )
      : scope.mode === "quiz"
        ? buildQuizQuestions(
            documents,
            scope.directions
          )
        : buildTypingQuestions(
            documents,
            scope.directions
          );

  const data =
    scope.mode === "flashcard"
      ? {
          mode: "flashcard",
          total: generated.length,
          cards: generated,
        }
      : {
          mode: scope.mode,
          total: generated.length,
          questions: generated,
        };

  return {
    mode: scope.mode,
    total: generated.length,
    data,
    meta: {
      reviewId: String(history._id),
      progress: {
        selectedVocabs: state.selectedIds.length,
        reviewedVocabs: state.completedIds.length,
        total: state.selectedIds.length,
        remaining: state.remainingIds.length,
        completed: state.remainingIds.length === 0,
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
  const reviewId = objectId(
    payload.reviewId || payload.id
  );

  if (!reviewId) {
    fail("Valid reviewId is required");
  }

  const history =
    await KanjiReviewHistory.findById(reviewId);

  if (!history) {
    fail("Review session not found", 404);
  }

  const item = normalizeSelection(payload);

  if (!item) {
    fail("Valid itemType and itemId are required");
  }

  const state = historyState(history);

  const selectedSet = new Set(
    state.selectedIds.map(selectionKey)
  );

  if (!selectedSet.has(selectionKey(item))) {
    fail("Item is not part of the review session");
  }

  const completedIds = cleanSelections([
    ...state.completedIds,
    item,
  ]);

  const completedSet = new Set(
    completedIds.map(selectionKey)
  );

  const remainingIds = state.selectedIds.filter(
    (entry) =>
      !completedSet.has(selectionKey(entry))
  );

  history.completedIds = mongoSelections(completedIds);
  history.remainingIds = mongoSelections(remainingIds);
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
      selected: state.selectedIds.length,
      reviewed: completedIds.length,
    },
  };
};
