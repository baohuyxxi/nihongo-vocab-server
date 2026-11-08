import mongoose from "mongoose";
import Kanji from "../models/Kanji.js";
import KanjiCurriculumEntry from "../models/KanjiCurriculumEntry.js";
import KanjiReviewHistory from "../models/KanjiReviewHistory.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";
import { shuffle } from "../utils/shuffle.js";

export const REVIEW_CURRICULUM = "sou-matome-n3-kanji";

const DEFAULT_KANJI_DIRECTIONS = ["kanji"];

const DEFAULT_VOCAB_DIRECTIONS = ["kanji"];

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

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value];
  return [];
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const normalizeItemId = (value) => {
  if (!value) return null;
  const stringValue = String(value).trim();
  if (!stringValue || !mongoose.Types.ObjectId.isValid(stringValue)) {
    return null;
  }
  return stringValue;
};

const normalizeSelectionEntry = (item) => {
  if (!item || typeof item !== "object") return null;

  const itemType = item.itemType;
  const itemId = normalizeItemId(item.itemId || item._id || item.id);

  if (!itemType || !["kanji", "vocabulary"].includes(itemType) || !itemId) {
    return null;
  }

  return { itemType, itemId };
};

const sanitizeSelectionList = (entries = []) => {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeSelectionEntry(entry))
    .filter(Boolean);
};

const throwError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const parseCsvNumberList = (value, min, max, label) => {
  if (value === undefined || value === null || value === "") {
    throwError(`Review scope requires ${label}`, 400);
  }

  const numbers = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));

  if (!numbers.length) {
    throwError(`Review scope requires valid ${label}`, 400);
  }

  const deduped = [...new Set(numbers)];
  const invalid = deduped.some((item) => item < min || item > max);

  if (invalid) {
    throwError(`${label} values must be between ${min} and ${max}`, 400);
  }

  return deduped;
};

export const parseReviewScope = (query = {}) => {
  const curriculum = String(query.curriculum || REVIEW_CURRICULUM).trim();

  if (curriculum !== REVIEW_CURRICULUM) {
    throwError("Unsupported curriculum. Only sou-matome-n3-kanji is allowed.", 400);
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

  const contentType = ["kanji", "vocabulary", "both"].includes(query.contentType)
    ? query.contentType
    : "both";

  const mode = ["flashcard", "quiz", "typing"].includes(query.mode)
    ? query.mode
    : "flashcard";

  const directions = safeArray(
    typeof query.directions === "string"
      ? query.directions.split(",")
      : query.directions
  ).map((item) => item.trim()).filter(Boolean);

  const normalizedDirections = directions.length
    ? directions.filter((direction) => VALID_DIRECTIONS.includes(direction))
    : contentType === "vocabulary"
      ? DEFAULT_VOCAB_DIRECTIONS
      : contentType === "kanji"
        ? DEFAULT_KANJI_DIRECTIONS
        : [...DEFAULT_KANJI_DIRECTIONS, ...DEFAULT_VOCAB_DIRECTIONS];

  const limit = Math.max(1, Number(query.limit || 20));

  return {
    curriculum,
    weeks,
    days,
    contentType,
    mode,
    directions: normalizedDirections,
    limit,
  };
};

export const normalizeTypingAnswer = (value = "") => {
  const text = String(value || "")
    .trim()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[。．]/g, "")
    .replace(/[・]/g, "")
    .replace(/\./g, "")
    .replace(/\uFF3A/g, "\u30A2")
    .replace(/\uFF3B/g, "\u30A1");

  return text
    .replace(/[ァ-ン]/g, (char) => {
      const code = char.charCodeAt(0) - 0x60;
      return String.fromCharCode(code);
    })
    .replace(/[ャュョ]/g, (char) => {
      const code = char.charCodeAt(0) - 0x60;
      return String.fromCharCode(code);
    });
};

const getKanjiItemData = (item) => {
  const meanings = unique(
    safeArray(item.meanings).concat(safeArray(item.meaning))
  );

  return {
    itemType: "kanji",
    itemId: item._id || item.id,
    front: item.kanji || "",
    meanings,
    onyomi: safeArray((item.onyomi || []).map((entry) => entry.reading || entry))
      .filter(Boolean),
    kunyomi: safeArray((item.kunyomi || []).map((entry) => entry.reading || entry))
      .filter(Boolean),
    hanViet: unique(safeArray(item.hanViet)),
  };
};

const getVocabularyItemData = (item) => {
  return {
    itemType: "vocabulary",
    itemId: item._id || item.id,
    front: item.word || item.kanji || "",
    meaning: item.meaning || "",
    hiragana: item.hiragana || "",
    hanViet: item.hanViet || "",
    readings: safeArray(item.readings || []).map((reading) =>
      typeof reading === "string" ? reading : reading.reading
    ),
    word: item.word || item.kanji || "",
  };
};

const itemSupportsDirection = (itemType, direction) => {
  const allowed = {
    kanji: [
      "kanji_meaning",
      "meaning_kanji",
      "onyomi",
      "kunyomi",
      "hanviet",
    ],
    vocabulary: [
      "kanji_reading",
      "reading_kanji",
      "vocab_meaning",
      "meaning_vocab",
    ],
  };

  return allowed[itemType]?.includes(direction) || false;
};

const getAnswerSet = (item, direction) => {
  switch (direction) {
    case "kanji":
      return [item.kanji || item.word || ""].filter(Boolean);
    case "kanji_meaning":
      return safeArray(item.meanings || item.meaning || item.meaning_vi);
    case "meaning_kanji":
      return [item.kanji].filter(Boolean);
    case "onyomi":
      return safeArray((item.onyomi || []).map((entry) => entry.reading || entry));
    case "kunyomi":
      return safeArray((item.kunyomi || []).map((entry) => entry.reading || entry));
    case "hanviet":
      return safeArray(item.hanViet || []);
    case "kanji_reading":
      return safeArray([item.hiragana || item.reading || item.word]);
    case "reading_kanji":
      return safeArray([item.word || item.kanji]);
    case "vocab_meaning":
      return safeArray([item.meaning]).filter(Boolean);
    case "meaning_vocab":
      return safeArray([item.word || item.kanji]).filter(Boolean);
    default:
      return [];
  }
};

const buildQuestionFront = (item, direction) => {
  switch (direction) {
    case "kanji_meaning":
      return item.kanji || "";
    case "meaning_kanji":
      return (safeArray(item.meanings || item.meaning).join(" / ") || item.kanji || "").trim();
    case "onyomi":
    case "kunyomi":
    case "hanviet":
      return item.kanji || "";
    case "kanji_reading":
      return item.word || item.kanji || "";
    case "reading_kanji":
      return item.hiragana || item.word || "";
    case "vocab_meaning":
      return item.word || item.kanji || "";
    case "meaning_vocab":
      return item.meaning || "";
    default:
      return "";
  }
};

const buildKanjiFlashcardBack = (item) => {
  const asReadingList = (values = []) => unique(
    safeArray(values).map((value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object") return String(value.reading || value.value || "").trim();
      return String(value || "").trim();
    })
  ).filter(Boolean);

  const hanViet = unique(safeArray(item.hanViet)).map((value) => String(value).trim()).filter(Boolean);
  const onyomi = asReadingList(item.onyomi);
  const kunyomi = asReadingList(item.kunyomi);
  const meanings = unique(safeArray(item.meanings)).map((value) => String(value).trim()).filter(Boolean);

  return {
    kanji: String(item.front || item.kanji || "").trim(),
    hanViet: hanViet.join(", ") || "",
    onyomi,
    kunyomi,
    meaning: meanings.length ? meanings.join("; ") : "",
  };
};

const buildVocabularyFlashcardBack = (item) => {
  const hanViet = item.hanViet ? String(item.hanViet).trim() : "";
  const hiragana = item.hiragana ? String(item.hiragana).trim() : "";
  const meaning = item.meaning ? String(item.meaning).trim() : "";

  return {
    word: String(item.word || item.kanji || "").trim(),
    hanViet,
    hiragana,
    meaning,
  };
};

export const buildFlashcardItems = (items = [], directions = []) => {
  const requestedDirections = Array.isArray(directions) && directions.length
    ? directions
    : ["kanji"];
  const cards = [];

  for (const item of items) {
    const itemType = item.itemType || (item.kanji ? "kanji" : "vocabulary");
    const data = itemType === "kanji" ? getKanjiItemData(item) : getVocabularyItemData(item);
    const itemId = normalizeItemId(data.itemId || item.itemId || item._id || item.id);

    if (!itemId) {
      continue;
    }

    const front = itemType === "kanji"
      ? String(data.front || item.kanji || "").trim()
      : String(data.front || item.word || "").trim();

    if (!front) {
      continue;
    }

    const effectiveDirection = requestedDirections.includes("kanji")
      ? "kanji"
      : requestedDirections.find((direction) => itemSupportsDirection(itemType, direction)) || "kanji";

    const back = itemType === "kanji"
      ? buildKanjiFlashcardBack({
          ...data,
          front,
          kanji: item.kanji || data.front || front,
          hanViet: item.hanViet || data.hanViet || [],
          onyomi: item.onyomi || data.onyomi || [],
          kunyomi: item.kunyomi || data.kunyomi || [],
          meanings: item.meanings || data.meanings || [],
        })
      : buildVocabularyFlashcardBack({
          ...data,
          word: item.word || data.word || front,
          hanViet: item.hanViet || data.hanViet || "",
          hiragana: item.hiragana || data.hiragana || "",
          meaning: item.meaning || data.meaning || "",
        });

    cards.push({
      id: `${itemType}-${itemId}-${effectiveDirection}`,
      itemType,
      itemId,
      direction: effectiveDirection,
      front,
      back,
    });
  }

  return cards;
};

const buildDistractors = (itemType, direction, allItems) => {
  const pool = [];

  for (const item of allItems) {
    const actualType = item.itemType || (item.kanji ? "kanji" : "vocabulary");
    if (actualType !== itemType) continue;

    const data = actualType === "kanji" ? getKanjiItemData(item) : getVocabularyItemData(item);
    const answers = unique(getAnswerSet(data, direction));
    for (const answer of answers) {
      if (answer && !pool.includes(answer)) {
        pool.push(answer);
      }
    }
  }

  return pool;
};

export const buildQuizQuestions = (items = [], directions = []) => {
  const cards = buildFlashcardItems(items, directions);
  const questions = [];

  for (const card of cards) {
    const sourceItem = items.find((item) => String(item._id || item.id || item.itemId) === String(card.itemId)) || card;
    const acceptedAnswers = unique(getAnswerSet(sourceItem, card.direction)).filter(Boolean);

    if (!acceptedAnswers.length) continue;

    const distractors = buildDistractors(card.itemType, card.direction, items)
      .filter((choice) => !acceptedAnswers.includes(choice));

    const choices = shuffle(unique([
      ...acceptedAnswers,
      ...distractors,
    ])).slice(0, 4);

    if (choices.length < 4) {
      continue;
    }

    const correct = acceptedAnswers[0];
    questions.push({
      id: card.id,
      itemType: card.itemType,
      direction: card.direction,
      question: card.front,
      correct,
      acceptedAnswers,
      choices: shuffle(choices),
    });
  }

  return questions;
};

export const buildTypingQuestions = (items = [], directions = []) => {
  const cards = buildFlashcardItems(items, directions);
  const questions = [];

  for (const card of cards) {
    const sourceItem = items.find((item) => String(item._id || item.id || item.itemId) === String(card.itemId)) || card;
    const acceptedAnswers = unique(
      getAnswerSet(sourceItem, card.direction).map((answer) => normalizeTypingAnswer(answer))
    ).filter(Boolean);

    if (!acceptedAnswers.length) continue;

    questions.push({
      id: card.id,
      itemType: card.itemType,
      direction: card.direction,
      question: card.front,
      correct: acceptedAnswers[0],
      acceptedAnswers,
    });
  }

  return questions;
};

const buildItemDocumentMap = async (items) => {
  const kanjiIds = items
    .filter((item) => item.itemType === "kanji")
    .map((item) => item.itemId)
    .filter(Boolean);

  const vocabularyIds = items
    .filter((item) => item.itemType === "vocabulary")
    .map((item) => item.itemId)
    .filter(Boolean);

  const [kanjiDocuments, vocabularyDocuments] = await Promise.all([
    kanjiIds.length ? Kanji.find({ _id: { $in: kanjiIds } }).lean() : [],
    vocabularyIds.length ? KanjiVocabulary.find({ _id: { $in: vocabularyIds } }).lean() : [],
  ]);

  const kanjiMap = new Map(kanjiDocuments.map((entry) => [String(entry._id), entry]));
  const vocabularyMap = new Map(
    vocabularyDocuments.map((entry) => [String(entry._id), entry])
  );

  return { kanjiMap, vocabularyMap };
};

const ensureSelectedItemsUnique = (items = []) => {
  const seen = new Set();
  const next = [];

  for (const item of items) {
    const key = `${item.itemType}:${String(item.itemId)}`;
    if (!seen.has(key)) {
      seen.add(key);
      next.push({
        itemType: item.itemType,
        itemId: item.itemId,
      });
    }
  }

  return next;
};

export const resolveSelectedCurriculumItems = async (scope) => {
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
  const seen = new Set();

  for (const entry of entries) {
    if ((scope.contentType === "kanji" || scope.contentType === "both") && entry.kanjiId) {
      const id = String(entry.kanjiId._id || entry.kanjiId);
      if (!seen.has(`kanji:${id}`)) {
        seen.add(`kanji:${id}`);
        selected.push({ itemType: "kanji", itemId: id });
      }
    }

    if ((scope.contentType === "vocabulary" || scope.contentType === "both") && Array.isArray(entry.vocabularyIds)) {
      for (const vocab of entry.vocabularyIds) {
        const id = String(vocab._id || vocab);
        if (!seen.has(`vocabulary:${id}`)) {
          seen.add(`vocabulary:${id}`);
          selected.push({ itemType: "vocabulary", itemId: id });
        }
      }
    }
  }

  return selected.slice(0, Number(scope.limit || 20));
};

const mapReviewRecord = (record) => {
  const selectedIds = sanitizeSelectionList(record?.selectedIds || []);
  const completedIds = sanitizeSelectionList(record?.completedIds || []);

  return {
    ...(record?.toObject ? record.toObject() : record || {}),
    selectedIds,
    completedIds,
    remainingIds: selectedIds.filter(
      (item) => !completedIds.some(
        (completed) =>
          completed.itemType === item.itemType && completed.itemId === item.itemId
      )
    ),
  };
};

export const createReviewSession = async (query = {}) => {
  const scope = parseReviewScope(query);
  const selectedItems = await resolveSelectedCurriculumItems(scope);

  if (!selectedItems.length) {
    throwError("No curriculum entries matched the selected weeks and days", 400);
  }

  const sessionKey = [
    scope.curriculum,
    scope.weeks.join(","),
    scope.days.join(","),
    scope.contentType,
    scope.mode,
    scope.directions.join(","),
  ].join("|");

  const reviewId = query.reviewId;
  let history;

  if (reviewId) {
    history = await KanjiReviewHistory.findById(reviewId);
    if (!history) {
      throwError("Review session not found", 404);
    }

    const sessionMatches =
      String(history.curriculum) === String(scope.curriculum)
      && JSON.stringify([...history.weeks].sort()) === JSON.stringify([...scope.weeks].sort())
      && JSON.stringify([...history.days].sort()) === JSON.stringify([...scope.days].sort())
      && history.contentType === scope.contentType
      && history.mode === scope.mode
      && JSON.stringify(history.directions || []) === JSON.stringify(scope.directions || []);

    if (!sessionMatches) {
      throwError("Review session does not match the requested curriculum scope", 400);
    }
  }

  if (!history) {
    history = await KanjiReviewHistory.findOne({ sessionKey });
  }

  const allSelected = ensureSelectedItemsUnique(selectedItems)
    .filter((item) => normalizeItemId(item.itemId))
    .map((item) => ({
      itemType: item.itemType,
      itemId: new mongoose.Types.ObjectId(item.itemId),
    }));

  if (!allSelected.length) {
    throwError("No valid curriculum items were found for the requested review scope", 400);
  }

  if (!history) {
    const reviewDocument = await KanjiReviewHistory.create({
      sessionKey,
      curriculum: scope.curriculum,
      weeks: scope.weeks,
      days: scope.days,
      contentType: scope.contentType,
      mode: scope.mode,
      directions: scope.directions,
      limit: scope.limit,
      selectedIds: allSelected,
      completedIds: [],
      remainingIds: allSelected,
      status: "active",
    });

    history = reviewDocument;
  }

  const sanitizedHistorySelected = sanitizeSelectionList(history.selectedIds || []);
  const sanitizedHistoryCompleted = sanitizeSelectionList(history.completedIds || []);

  const selectedSet = new Set(
    sanitizedHistorySelected.map((item) => `${item.itemType}:${item.itemId}`)
  );
  const completedSet = new Set(
    sanitizedHistoryCompleted.map((item) => `${item.itemType}:${item.itemId}`)
  );
  const remaining = sanitizedHistorySelected.filter(
    (item) => !completedSet.has(`${item.itemType}:${item.itemId}`)
  );

  const itemsToRender = remaining.length
    ? remaining.slice(0, scope.limit)
    : [];

  const itemMaps = await buildItemDocumentMap(itemsToRender.map((item) => ({
    itemType: item.itemType,
    itemId: String(item.itemId),
  })));

  const renderedItems = itemsToRender.map((item) => {
    const itemValue = item.itemType === "kanji"
      ? itemMaps.kanjiMap.get(String(item.itemId))
      : itemMaps.vocabularyMap.get(String(item.itemId));

    if (!itemValue) return null;
    return {
      ...item,
      ...(item.itemType === "kanji" ? getKanjiItemData(itemValue) : getVocabularyItemData(itemValue)),
    };
  }).filter(Boolean);

  const generated =
    scope.mode === "flashcard"
      ? buildFlashcardItems(renderedItems, scope.directions)
      : scope.mode === "quiz"
        ? buildQuizQuestions(renderedItems, scope.directions)
        : buildTypingQuestions(renderedItems, scope.directions);

  const record = mapReviewRecord(history);

  return {
    mode: scope.mode,
    total: generated.length,
    data: scope.mode === "flashcard"
      ? { mode: "flashcard", total: generated.length, cards: generated }
      : scope.mode === "quiz"
        ? { mode: "quiz", total: generated.length, questions: generated }
        : { mode: "typing", total: generated.length, questions: generated },
    meta: {
      reviewId: String(history._id),
      progress: {
        selectedVocabs: record.selectedIds.length,
        reviewedVocabs: record.completedIds.length,
        total: record.selectedIds.length,
        remaining: Math.max(record.selectedIds.length - record.completedIds.length, 0),
        completed: record.completedIds.length >= record.selectedIds.length,
      },
    },
  };
};

export const completeReviewSession = async (payload = {}) => {
  const reviewId = payload.reviewId || payload.id;

  if (!reviewId) {
    throwError("reviewId is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throwError("Invalid reviewId", 400);
  }

  const history = await KanjiReviewHistory.findById(reviewId);

  if (!history) {
    throwError("Review session not found", 404);
  }

  const itemType = payload.itemType;
  const itemId = payload.itemId;

  if (!itemType || !itemId) {
    throwError("itemType and itemId are required", 400);
  }

  if (!["kanji", "vocabulary"].includes(itemType)) {
    throwError("itemType must be kanji or vocabulary", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throwError("Invalid itemId", 400);
  }

  const selectedIds = sanitizeSelectionList(history.selectedIds || []);
  const completedIds = sanitizeSelectionList(history.completedIds || []);

  const selectedMatch = selectedIds.some(
    (entry) => entry.itemType === itemType && entry.itemId === String(itemId)
  );

  if (!selectedMatch) {
    throwError("Item is not part of the active review session", 400);
  }

  const existingCompleted = completedIds.some(
    (entry) => entry.itemType === itemType && entry.itemId === String(itemId)
  );

  if (!existingCompleted) {
    completedIds.push({ itemType, itemId: String(itemId) });
    history.completedIds = completedIds.map((entry) => ({
      itemType: entry.itemType,
      itemId: new mongoose.Types.ObjectId(entry.itemId),
    }));
  }

  history.remainingIds = selectedIds
    .filter(
      (item) => !completedIds.some(
        (completed) =>
          completed.itemType === item.itemType && completed.itemId === item.itemId
      )
    )
    .map((item) => ({
      itemType: item.itemType,
      itemId: new mongoose.Types.ObjectId(item.itemId),
    }));

  history.status =
    history.completedIds.length >= history.selectedIds.length ? "completed" : "active";

  await history.save();

  return {
    success: true,
    message: "Review item marked as completed",
    data: {
      reviewId: String(history._id),
      itemType,
      itemId,
      completed: true,
      remaining: history.remainingIds.length,
      selected: history.selectedIds.length,
      reviewed: history.completedIds.length,
    },
  };
};
