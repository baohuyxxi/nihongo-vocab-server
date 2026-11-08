import mongoose from "mongoose";
import Kanji from "../models/Kanji.js";
import { analyzeJapaneseWord } from "./japaneseAnalyzer.service.js";

const normalizeReadingList = (values = []) => {
  const entries = Array.isArray(values) ? values : values ? [values] : [];
  const seen = new Set();
  const normalized = [];

  for (const entry of entries) {
    if (!entry) continue;

    const reading = typeof entry === "string"
      ? entry.trim()
      : String(entry.reading || entry.value || "").trim();

    if (!reading) continue;

    if (seen.has(reading)) continue;

    seen.add(reading);

    normalized.push({
      reading,
      romaji: typeof entry === "object" && entry.romaji ? String(entry.romaji).trim() : "",
      okurigana: typeof entry === "object" && entry.okurigana ? String(entry.okurigana).trim() : "",
      note: typeof entry === "object" && entry.note ? String(entry.note).trim() : "",
      type: typeof entry === "object" && entry.type ? entry.type : "other",
    });
  }

  return normalized;
};

export const extractKanjiFromWord = (word = "") => {
  const source = String(word || "").trim();
  if (!source) return [];

  const matches = source.match(/\p{Script=Han}/gu) || [];
  return [...new Set(matches)];
};

export const mergeKanjiReadings = (existing = [], incoming = []) => {
  const merged = [...(Array.isArray(existing) ? existing : []), ...normalizeReadingList(incoming)];
  const seen = new Set();
  const result = [];

  for (const entry of merged) {
    if (!entry || typeof entry !== "object") continue;

    const reading = String(entry.reading || entry.value || "").trim();
    if (!reading) continue;

    const key = reading.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({
      reading,
      romaji: String(entry.romaji || "").trim(),
      okurigana: String(entry.okurigana || "").trim(),
      note: String(entry.note || "").trim(),
      type: entry.type || "other",
    });
  }

  return result;
};

export const syncKanjiFromWord = async (word, session = null, extra = {}) => {
  const normalizedWord = String(word || "").trim();

  let analysis = {
    word: normalizedWord,
    kanji: extractKanjiFromWord(normalizedWord),
    tokens: extractKanjiFromWord(normalizedWord).map((character) => ({
      surface: character,
      reading: "",
      pronunciation: "",
      partOfSpeech: "",
      kanji: [character],
    })),
  };

  try {
    const analyzed = await analyzeJapaneseWord(normalizedWord);
    analysis = analyzed;
  } catch (error) {
    // Kuromoji may be disabled in this environment; fall back to regex-based kanji extraction.
  }

  const kanjiList = [...new Set((analysis.kanji || extractKanjiFromWord(normalizedWord)))]
    .filter(Boolean);

  const kanjiIds = [];
  const incomingOnyomi = normalizeReadingList(extra.onyomi || []);
  const incomingKunyomi = normalizeReadingList(extra.kunyomi || []);
  const incomingHanViet = Array.isArray(extra.hanViet)
    ? extra.hanViet
    : extra.hanViet
      ? [extra.hanViet]
      : [];
  const incomingMeanings = Array.isArray(extra.meanings)
    ? extra.meanings
    : extra.meanings
      ? [extra.meanings]
      : [];

  for (const character of kanjiList) {
    let query = Kanji.findOne({ kanji: character });

    if (session) {
      query = query.session(session);
    }

    let existingKanji = await query;

    if (!existingKanji) {
      const payload = { kanji: character };

      if (incomingOnyomi.length) {
        payload.onyomi = incomingOnyomi;
      }
      if (incomingKunyomi.length) {
        payload.kunyomi = incomingKunyomi;
      }
      if (incomingHanViet.length) {
        payload.hanViet = [...new Set(incomingHanViet.map((value) => String(value).trim()).filter(Boolean))];
      }
      if (incomingMeanings.length) {
        payload.meanings = [...new Set(incomingMeanings.map((value) => String(value).trim()).filter(Boolean))];
      }

      const [createdKanji] = await Kanji.create(
        [payload],
        session ? { session } : {}
      );

      existingKanji = createdKanji;
    } else {
      const update = {};
      const nextOnyomi = mergeKanjiReadings(existingKanji.onyomi || [], incomingOnyomi);
      const nextKunyomi = mergeKanjiReadings(existingKanji.kunyomi || [], incomingKunyomi);
      const nextHanViet = [...new Set([...(existingKanji.hanViet || []), ...incomingHanViet.map((value) => String(value).trim()).filter(Boolean)])];
      const nextMeanings = [...new Set([...(existingKanji.meanings || []), ...incomingMeanings.map((value) => String(value).trim()).filter(Boolean)])];

      if (nextOnyomi.length && JSON.stringify(nextOnyomi) !== JSON.stringify(existingKanji.onyomi || [])) {
        update.onyomi = nextOnyomi;
      }
      if (nextKunyomi.length && JSON.stringify(nextKunyomi) !== JSON.stringify(existingKanji.kunyomi || [])) {
        update.kunyomi = nextKunyomi;
      }
      if (nextHanViet.length && JSON.stringify(nextHanViet) !== JSON.stringify(existingKanji.hanViet || [])) {
        update.hanViet = nextHanViet;
      }
      if (nextMeanings.length && JSON.stringify(nextMeanings) !== JSON.stringify(existingKanji.meanings || [])) {
        update.meanings = nextMeanings;
      }

      if (Object.keys(update).length) {
        existingKanji = await Kanji.findByIdAndUpdate(
          existingKanji._id,
          { $set: update },
          { new: true, runValidators: true }
        );
      }
    }

    kanjiIds.push(existingKanji._id);
  }

  return {
    kanjiIds: [...new Set(kanjiIds.map((id) => String(id)))].map((id) => new mongoose.Types.ObjectId(id)),
    analysis,
  };
};