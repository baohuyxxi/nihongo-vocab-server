
import mongoose from "mongoose";
import Kanji from "../models/Kanji.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";
import { syncKanjiFromWord } from "./kanjiSync.service.js";

const throwError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || 20)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const kanjiPopulate = {
  path: "kanjiIds",
  populate: {
    path: "radicalId",
    model: "Radical",
  },
};

// VALIDATE KANJI IDS
const validateKanjiIds = async (kanjiIds) => {
  if (!Array.isArray(kanjiIds)) {
    throwError("kanjiIds must be an array", 400);
  }

  const uniqueIds = [...new Set(kanjiIds.map(String))];

  for (const id of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError(`Invalid kanji ID: ${id}`, 400);
    }
  }

  const count = await Kanji.countDocuments({
    _id: { $in: uniqueIds },
  });

  if (count !== uniqueIds.length) {
    throwError("One or more kanji IDs do not exist", 400);
  }

  return uniqueIds;
};

// GET ALL
export const getAllKanjiVocabulary = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);

  const {
    search,
    jlpt,
    wordType,
    partOfSpeech,
    topic,
    kanjiId,
    status,
  } = query;

  const filter = {};

  if (search?.trim()) {
    const keyword = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { word: keyword },
      { hiragana: keyword },
      { katakana: keyword },
      { meaning: keyword },
      { hanViet: keyword },
      { topic: keyword },
    ];
  }

  if (jlpt) filter.jlpt = jlpt;
  if (wordType) filter.wordType = wordType;
  if (partOfSpeech) filter.partOfSpeech = partOfSpeech;
  if (topic) filter.topic = topic;
  if (status) filter.status = status;

  if (kanjiId) {
    if (!mongoose.Types.ObjectId.isValid(kanjiId)) {
      throwError("Invalid kanjiId", 400);
    }

    filter.kanjiIds = kanjiId;
  }

  const [data, total] = await Promise.all([
    KanjiVocabulary.find(filter)
      .populate(kanjiPopulate)
      .sort({ word: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    KanjiVocabulary.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// GET BY ID
export const getKanjiVocabularyById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid vocabulary ID", 400);
  }

  const data = await KanjiVocabulary.findById(id)
    .populate(kanjiPopulate)
    .lean();

  if (!data) {
    throwError("Vocabulary not found", 404);
  }

  return data;
};

// CREATE
// export const createKanjiVocabulary = async (payload) => {
//   const { word, kanjiIds = [], ...rest } = payload;

//   if (!word?.trim()) {
//     throwError("Word is required", 400);
//   }

//   const validKanjiIds = await validateKanjiIds(kanjiIds);

//   const data = await KanjiVocabulary.create({
//     ...rest,
//     word: word.trim(),
//     kanjiIds: validKanjiIds,
//   });

//   return KanjiVocabulary.findById(data._id)
//     .populate(kanjiPopulate)
//     .lean();
// };

// UPDATE
export const updateKanjiVocabulary = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid vocabulary ID", 400);
  }

  const current = await KanjiVocabulary.findById(id);

  if (!current) {
    throwError("Vocabulary not found", 404);
  }

  const updateData = { ...payload };

  if (updateData.word !== undefined) {
    if (!updateData.word.trim()) {
      throwError("Word cannot be empty", 400);
    }

    updateData.word = updateData.word.trim();
  }

  if (updateData.kanjiIds !== undefined) {
    updateData.kanjiIds = await validateKanjiIds(
      updateData.kanjiIds
    );
  }

  return KanjiVocabulary.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate(kanjiPopulate)
    .lean();
};

// DELETE
export const deleteKanjiVocabulary = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid vocabulary ID", 400);
  }

  const data = await KanjiVocabulary.findByIdAndDelete(id);

  if (!data) {
    throwError("Vocabulary not found", 404);
  }

  return data;
};


export const createKanjiVocabulary = async (data) => {
  const { kanjiIds, analysis } = await syncKanjiFromWord(
    data.word
  );

  const vocabulary = await KanjiVocabulary.create({
    ...data,
    kanjiIds,

    // Lưu cách đọc mà tokenizer phân tích được.
    readings: analysis.tokens
      .filter((token) => token.reading)
      .map((token) => ({
        reading: token.reading,
        type: "other",
        note: `Phân tích từ: ${token.surface}`,
      })),
  });

  return {
    vocabulary,
    analysis,
  };
};