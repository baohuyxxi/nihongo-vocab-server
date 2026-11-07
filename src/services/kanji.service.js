
import mongoose from "mongoose";
import Kanji from "../models/Kanji.js";
import KanjiVocabulary from "../models/KanjiVocabulary.js";
import Radical from "../models/Radical.js";

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

// GET ALL
export const getAllKanji = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const { search, jlpt, radicalId, status } = query;

  const filter = {};

  if (search?.trim()) {
    const keyword = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { kanji: keyword },
      { hanViet: keyword },
      { meanings: keyword },
      { notes: keyword },
    ];
  }

  if (jlpt) filter.jlpt = jlpt;
  if (status) filter.status = status;

  if (radicalId) {
    if (!mongoose.Types.ObjectId.isValid(radicalId)) {
      throwError("Invalid radicalId", 400);
    }

    filter.radicalId = radicalId;
  }

  const [data, total] = await Promise.all([
    Kanji.find(filter)
      .populate("radicalId")
      .sort({ kanji: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Kanji.countDocuments(filter),
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
export const getKanjiById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid kanji ID", 400);
  }

  const data = await Kanji.findById(id)
    .populate("radicalId")
    .lean();

  if (!data) {
    throwError("Kanji not found", 404);
  }

  return data;
};

// GET RELATED VOCABULARY
export const getKanjiVocabulary = async (id, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid kanji ID", 400);
  }

  const exists = await Kanji.exists({ _id: id });

  if (!exists) {
    throwError("Kanji not found", 404);
  }

  const { page, limit, skip } = getPagination(query);

  const filter = { kanjiIds: id };

  const [data, total] = await Promise.all([
    KanjiVocabulary.find(filter)
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

// CREATE
export const createKanji = async (payload) => {
  const { kanji, radicalId, ...rest } = payload;

  if (!kanji?.trim()) {
    throwError("Kanji is required", 400);
  }

  if (radicalId) {
    if (!mongoose.Types.ObjectId.isValid(radicalId)) {
      throwError("Invalid radicalId", 400);
    }

    const radicalExists = await Radical.exists({ _id: radicalId });

    if (!radicalExists) {
      throwError("Radical not found", 404);
    }
  }

  const data = await Kanji.create({
    ...rest,
    kanji: kanji.trim(),
    radicalId: radicalId || undefined,
  });

  return Kanji.findById(data._id)
    .populate("radicalId")
    .lean();
};

// UPDATE
export const updateKanji = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid kanji ID", 400);
  }

  const current = await Kanji.findById(id);

  if (!current) {
    throwError("Kanji not found", 404);
  }

  const updateData = { ...payload };

  if (updateData.kanji !== undefined) {
    if (!updateData.kanji.trim()) {
      throwError("Kanji cannot be empty", 400);
    }

    updateData.kanji = updateData.kanji.trim();
  }

  if (updateData.radicalId !== undefined) {
    if (!updateData.radicalId) {
      updateData.radicalId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(updateData.radicalId)) {
        throwError("Invalid radicalId", 400);
      }

      const radicalExists = await Radical.exists({
        _id: updateData.radicalId,
      });

      if (!radicalExists) {
        throwError("Radical not found", 404);
      }
    }
  }

  return Kanji.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate("radicalId")
    .lean();
};

// DELETE
export const deleteKanji = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid kanji ID", 400);
  }

  const kanji = await Kanji.findById(id);

  if (!kanji) {
    throwError("Kanji not found", 404);
  }

  const isUsed = await KanjiVocabulary.exists({
    kanjiIds: id,
  });

  if (isUsed) {
    throwError(
      "Cannot delete kanji because it is being used by vocabulary",
      409
    );
  }

  await Kanji.findByIdAndDelete(id);

  return kanji;
};
