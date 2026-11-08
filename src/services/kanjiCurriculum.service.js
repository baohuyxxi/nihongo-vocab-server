import mongoose from "mongoose";
import Kanji from "../models/Kanji.js";
import KanjiCurriculumEntry from "../models/KanjiCurriculumEntry.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";
import { extractKanjiFromWord } from "./kanjiSync.service.js";

const CURRICULUM_ID = "sou-matome-n3-kanji";

const throwError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const toObjectId = (value) => {
  if (!value) return null;
  return new mongoose.Types.ObjectId(String(value));
};

const normalizeEntry = (entry) => {
  const curriculum = String(entry.curriculum || CURRICULUM_ID).trim();
  const week = Number(entry.week);
  const day = Number(entry.day);
  const order = Number(entry.order);

  if (curriculum !== CURRICULUM_ID) {
    throwError("Unsupported curriculum", 400);
  }

  if (!Number.isInteger(week) || week < 1 || week > 6) {
    throwError("Week must be an integer between 1 and 6", 400);
  }

  if (!Number.isInteger(day) || day < 1 || day > 7) {
    throwError("Day must be an integer between 1 and 7", 400);
  }

  if (!Number.isInteger(order) || order < 1) {
    throwError("Order must be a positive integer", 400);
  }

  if (entry.kanjiId && !mongoose.Types.ObjectId.isValid(entry.kanjiId)) {
    throwError(`Invalid kanjiId: ${entry.kanjiId}`, 400);
  }

  const arr = Array.isArray(entry.vocabularyIds)
    ? entry.vocabularyIds
    : [];

  const vocabularyIds = [...new Set(arr.map(String))];

  for (const vocabId of vocabularyIds) {
    if (!mongoose.Types.ObjectId.isValid(vocabId)) {
      throwError(`Invalid vocabularyId: ${vocabId}`, 400);
    }
  }

  return {
    curriculum,
    week,
    day,
    order,
    kanjiId: entry.kanjiId ? toObjectId(entry.kanjiId) : null,
    vocabularyIds: vocabularyIds.map((id) => toObjectId(id)),
  };
};

export const ensureAdminAccess = (req) => {
  const apiKey = process.env.ADMIN_API_KEY;
  const headerKey = req?.headers?.["x-admin-key"] || req?.headers?.["X-Admin-Key"];

  if (!apiKey) {
    throwError(
      "Import is restricted. Set ADMIN_API_KEY to enable curriculum import.",
      403
    );
  }

  if (headerKey !== apiKey) {
    throwError("Forbidden: invalid admin key", 403);
  }
};

export const getCurriculumOverview = async () => {
  const entries = await KanjiCurriculumEntry.find({ curriculum: CURRICULUM_ID })
    .lean();

  const weeks = Array.from({ length: 6 }, (_, index) => ({
    week: index + 1,
    days: Array.from({ length: 7 }, (_, dayIndex) => ({
      day: dayIndex + 1,
      totalEntries: 0,
      kanjiCount: 0,
      vocabularyCount: 0,
    })),
  }));

  for (const entry of entries) {
    const weekIndex = Number(entry.week) - 1;
    const dayIndex = Number(entry.day) - 1;

    if (!weeks[weekIndex] || !weeks[weekIndex].days[dayIndex]) {
      continue;
    }

    const dayItem = weeks[weekIndex].days[dayIndex];
    dayItem.totalEntries += 1;

    if (entry.kanjiId) {
      dayItem.kanjiCount += 1;
    }

    if (Array.isArray(entry.vocabularyIds)) {
      dayItem.vocabularyCount += entry.vocabularyIds.length;
    }
  }

  return weeks;
};

export const getEntriesByWeekAndDay = async ({ week, day }) => {
  const weekNumber = Number(week);
  const dayNumber = Number(day);

  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 6) {
    throwError("Week must be between 1 and 6", 400);
  }

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
    throwError("Day must be between 1 and 7", 400);
  }

  const entries = await KanjiCurriculumEntry.find({
    curriculum: CURRICULUM_ID,
    week: weekNumber,
    day: dayNumber,
  })
    .sort({ order: 1, createdAt: 1 })
    .populate("kanjiId")
    .populate("vocabularyIds")
    .lean();

  return entries;
};

export const getEntryById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid curriculum entry id", 400);
  }

  const entry = await KanjiCurriculumEntry.findById(id)
    .populate("kanjiId")
    .populate("vocabularyIds")
    .lean();

  if (!entry) {
    throwError("Curriculum entry not found", 404);
  }

  const baseResponse = {
    ...entry,
    kanji: entry.kanjiId || null,
    relatedVocabulary: Array.isArray(entry.vocabularyIds)
      ? entry.vocabularyIds
      : [],
  };

  if (entry.kanjiId) {
    const kanji = entry.kanjiId;
    baseResponse.kanjiDetails = {
      id: kanji._id,
      kanji: kanji.kanji,
      onyomi: (kanji.onyomi || []).map((item) => item.reading),
      kunyomi: (kanji.kunyomi || []).map((item) => item.reading),
      hanViet: kanji.hanViet || [],
      meanings: kanji.meanings || [],
      radical: kanji.radicalId || null,
    };
  }

  return baseResponse;
};

const asUniqueStringList = (values = []) => {
  const source = Array.isArray(values) ? values : [values].filter(Boolean);

  return [...new Set(
    source
      .map((value) => String(value).trim())
      .filter(Boolean)
  )];
};

const mergeReadingEntries = (existing = [], incoming = []) => {
  const merged = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])];
  const keyed = new Map();

  for (const value of merged) {
    if (!value || typeof value !== "object") continue;

    const reading = String(value.reading || value.value || "").trim();
    if (!reading) continue;

    const normalized = {
      reading,
      romaji: value.romaji || "",
      okurigana: value.okurigana || "",
      note: value.note || "",
      type: value.type || "other",
    };

    if (!keyed.has(reading)) {
      keyed.set(reading, normalized);
    }
  }

  return [...keyed.values()];
};

const ensureKanjiReadings = (values = [], defaultType = "other") => {
  const source = Array.isArray(values) ? values : [];
  const normalized = [];

  for (const value of source) {
    if (!value) continue;

    if (typeof value === "string") {
      const reading = value.trim();
      if (!reading) continue;
      normalized.push({ reading, romaji: "", okurigana: "", note: "", type: defaultType });
      continue;
    }

    if (typeof value === "object") {
      const reading = String(value.reading || value.value || "").trim();
      if (!reading) continue;
      normalized.push({
        reading,
        romaji: value.romaji || "",
        okurigana: value.okurigana || "",
        note: value.note || "",
        type: value.type || defaultType,
      });
    }
  }

  return normalized.filter((item, index, arr) => {
    const duplicate = arr.findIndex((candidate) => candidate.reading === item.reading);
    return duplicate === index;
  });
};

export const normalizeCurriculumImportPayload = (payload) => {
  const rawEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.entries)
      ? payload.entries
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  if (!rawEntries.length) {
    throwError("No curriculum entries were provided", 400);
  }

  const normalized = [];

  for (const entry of rawEntries) {
    if (!entry || typeof entry !== "object") {
      throwError("Each curriculum item must be an object", 400);
    }

    const curriculum = String(entry.curriculum || payload?.curriculum || CURRICULUM_ID).trim();
    const week = Number(entry.week ?? payload?.week);
    const day = Number(entry.day ?? payload?.day);
    const order = Number(entry.order);

    if (curriculum !== CURRICULUM_ID) {
      throwError("Unsupported curriculum", 400);
    }

    if (!Number.isInteger(week) || week < 1 || week > 6) {
      throwError("Week must be an integer between 1 and 6", 400);
    }

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throwError("Day must be an integer between 1 and 7", 400);
    }

    if (!Number.isInteger(order) || order < 1) {
      throwError("Order must be a positive integer", 400);
    }

    const kanji = String(entry.kanji || "").trim();
    const hasVocabulary = Array.isArray(entry.vocabulary) && entry.vocabulary.length > 0;

    if (!kanji && !hasVocabulary) {
      continue;
    }

    normalized.push({
      curriculum,
      week,
      day,
      order,
      kanji,
      onyomi: entry.onyomi || [],
      kunyomi: entry.kunyomi || [],
      hanViet: entry.hanViet || entry.hanviet || "",
      meanings: Array.isArray(entry.meanings) ? entry.meanings : [],
      vocabulary: Array.isArray(entry.vocabulary) ? entry.vocabulary : [],
    });
  }

  if (!normalized.length) {
    throwError("No valid curriculum items were provided", 400);
  }

  return normalized;
};

const normalizeHanVietTokens = (value) => {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\s+/) : [];

  return [...new Set(
    source
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
};

const syncVocabularyKanjiLinks = async (vocab = {}) => {
  const word = String(vocab.word || "").trim();
  const hanVietValue = vocab.hanViet ?? vocab.han_viet ?? "";
  const hanVietTokens = normalizeHanVietTokens(hanVietValue);
  const kanjiList = extractKanjiFromWord(word);

  if (!word || !kanjiList.length) {
    return [];
  }

  const linkedIds = [];

  for (let index = 0; index < kanjiList.length; index += 1) {
    const kanjiValue = kanjiList[index];
    const matchedHanViet = hanVietTokens.length === kanjiList.length
      ? hanVietTokens[index]
      : "";

    let existingKanji = await Kanji.findOne({ kanji: kanjiValue }).lean();

    if (!existingKanji) {
      const created = await Kanji.create({
        kanji: kanjiValue,
        ...(matchedHanViet ? { hanViet: [matchedHanViet] } : {}),
      });
      existingKanji = created.toObject ? created.toObject() : created;
    } else if (matchedHanViet) {
      const existingHanViet = Array.isArray(existingKanji.hanViet)
        ? existingKanji.hanViet.map((item) => String(item).trim())
        : [];

      const nextHanViet = [...new Set([...existingHanViet, matchedHanViet])];
      const alreadyMatched = existingHanViet.some((item) => item.toLowerCase() === matchedHanViet.toLowerCase());

      if (!alreadyMatched && nextHanViet.length !== existingHanViet.length) {
        existingKanji = await Kanji.findByIdAndUpdate(
          existingKanji._id,
          { $set: { hanViet: nextHanViet } },
          { new: true, runValidators: true }
        ).lean();
      }
    }

    if (existingKanji?._id) {
      linkedIds.push(String(existingKanji._id));
    }
  }

  return [...new Set(linkedIds)].map((id) => new mongoose.Types.ObjectId(id));
};

const ensureKanjiDocument = async (entry) => {
  const kanjiValue = String(entry.kanji || "").trim();

  if (!kanjiValue) {
    return { doc: null, created: false, updated: false };
  }

  const existing = await Kanji.findOne({ kanji: kanjiValue }).lean();

  const nextOnyomi = ensureKanjiReadings(entry.onyomi || []);
  const nextKunyomi = ensureKanjiReadings(entry.kunyomi || []);
  const nextHanViet = asUniqueStringList(Array.isArray(entry.hanViet) ? entry.hanViet : [entry.hanViet]);
  const nextMeanings = asUniqueStringList(entry.meanings || []);

  const mergedOnyomi = existing ? mergeReadingEntries(existing.onyomi || [], nextOnyomi) : nextOnyomi;
  const mergedKunyomi = existing ? mergeReadingEntries(existing.kunyomi || [], nextKunyomi) : nextKunyomi;

  const update = {
    kanji: kanjiValue,
    onyomi: mergedOnyomi,
    kunyomi: mergedKunyomi,
    hanViet: existing ? [...new Set([...(existing.hanViet || []), ...nextHanViet])] : nextHanViet,
    meanings: existing ? [...new Set([...(existing.meanings || []), ...nextMeanings])] : nextMeanings,
  };

  if (!existing) {
    const created = await Kanji.create(update);
    return { doc: created, created: true, updated: false };
  }

  const updated = await Kanji.findByIdAndUpdate(
    existing._id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  return { doc: updated, created: false, updated: true };
};

const ensureVocabularyDocument = async (entry, kanjiId) => {
  const vocabList = Array.isArray(entry.vocabulary) ? entry.vocabulary : [];
  const docs = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const vocab of vocabList) {
    if (!vocab || typeof vocab !== "object") continue;

    const word = String(vocab.word || "").trim();
    const hiragana = String(vocab.hiragana || vocab.reading || "").trim();
    const meaning = String(vocab.meaning || "").trim();

    if (!word || !hiragana || !meaning) {
      continue;
    }

    const existing = await KanjiVocabulary.findOne({ word, hiragana }).lean();
    const linkedKanjiIds = await syncVocabularyKanjiLinks(vocab);
    const combinedKanjiIds = [...new Set([
      ...(existing ? (existing.kanjiIds || []).map((item) => String(item)) : []),
      ...(kanjiId ? [String(kanjiId)] : []),
      ...linkedKanjiIds.map((id) => String(id)),
    ])].filter(Boolean);

    const payload = {
      word,
      hiragana,
      meaning,
      kanjiIds: combinedKanjiIds.map((id) => new mongoose.Types.ObjectId(id)),
      hanViet: vocab.hanViet || vocab.han_viet || "",
      readings: [
        {
          reading: hiragana,
          type: "other",
          note: `Imported from curriculum ${entry.curriculum}`,
        },
      ],
      jlpt: Array.isArray(vocab.jlpt) ? vocab.jlpt : ["N3"],
      wordType: vocab.wordType || "compound",
      status: "active",
    };

    if (!existing) {
      const doc = await KanjiVocabulary.create(payload);
      docs.push(doc);
      createdCount += 1;
      continue;
    }

    const updated = await KanjiVocabulary.findByIdAndUpdate(
      existing._id,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    docs.push(updated);
    updatedCount += 1;
  }

  return { docs, createdCount, updatedCount };
};

export const importCurriculumEntries = async (payload) => {
  const normalizedEntries = normalizeCurriculumImportPayload(payload);
  const results = [];
  let createdKanjiCount = 0;
  let updatedKanjiCount = 0;
  let createdVocabularyCount = 0;
  let updatedVocabularyCount = 0;

  for (const entry of normalizedEntries) {
    const { doc: kanjiDoc, created: kanjiCreated, updated: kanjiUpdated } = await ensureKanjiDocument(entry);

    if (!kanjiDoc) {
      continue;
    }

    const { docs: vocabDocs, createdCount: vocabCreatedCount, updatedCount: vocabUpdatedCount } = await ensureVocabularyDocument(entry, kanjiDoc._id);
    const vocabularyIds = vocabDocs.map((doc) => doc._id);

    const existingEntry = await KanjiCurriculumEntry.findOne({
      curriculum: entry.curriculum,
      week: entry.week,
      day: entry.day,
      order: entry.order,
    }).lean();

    const nextEntry = {
      curriculum: entry.curriculum,
      week: entry.week,
      day: entry.day,
      order: entry.order,
      kanjiId: kanjiDoc._id,
      vocabularyIds,
    };

    const stored = await KanjiCurriculumEntry.findOneAndUpdate(
      {
        curriculum: entry.curriculum,
        week: entry.week,
        day: entry.day,
        order: entry.order,
      },
      { $set: nextEntry },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    results.push({
      ...stored.toObject(),
      kanji: kanjiDoc,
      vocabulary: vocabDocs,
      inserted: !existingEntry,
    });

    if (kanjiCreated) {
      createdKanjiCount += 1;
    }

    if (kanjiUpdated) {
      updatedKanjiCount += 1;
    }

    createdVocabularyCount += vocabCreatedCount;
    updatedVocabularyCount += vocabUpdatedCount;
  }

  return {
    success: true,
    curriculum: CURRICULUM_ID,
    importedCount: results.length,
    createdKanjiCount,
    updatedKanjiCount,
    createdVocabularyCount,
    updatedVocabularyCount,
    items: results,
  };
};
