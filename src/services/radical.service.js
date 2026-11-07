
import mongoose from "mongoose";
import Radical from "../models/Radical.js";
import Kanji from "../models/Kanji.js";

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
export const getAllRadicals = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const { search, status } = query;

  const filter = {};

  if (search?.trim()) {
    const keyword = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { character: keyword },
      { name: keyword },
      { hanViet: keyword },
      { meanings: keyword },
      { notes: keyword },
    ];
  }

  if (status) filter.status = status;

  const [data, total] = await Promise.all([
    Radical.find(filter)
      .sort({ character: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Radical.countDocuments(filter),
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
export const getRadicalById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid radical ID", 400);
  }

  const data = await Radical.findById(id).lean();

  if (!data) {
    throwError("Radical not found", 404);
  }

  return data;
};

// GET RELATED KANJI
export const getRadicalKanji = async (id, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid radical ID", 400);
  }

  const exists = await Radical.exists({ _id: id });

  if (!exists) {
    throwError("Radical not found", 404);
  }

  const { page, limit, skip } = getPagination(query);
  const filter = { radicalId: id };

  const [data, total] = await Promise.all([
    Kanji.find(filter)
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

// CREATE
export const createRadical = async (payload) => {
  const { character, ...rest } = payload;

  if (!character?.trim()) {
    throwError("Character is required", 400);
  }

  return Radical.create({
    ...rest,
    character: character.trim(),
  });
};

// UPDATE
export const updateRadical = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid radical ID", 400);
  }

  const current = await Radical.findById(id);

  if (!current) {
    throwError("Radical not found", 404);
  }

  const updateData = { ...payload };

  if (updateData.character !== undefined) {
    if (!updateData.character.trim()) {
      throwError("Character cannot be empty", 400);
    }

    updateData.character = updateData.character.trim();
  }

  return Radical.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
};

// DELETE
export const deleteRadical = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError("Invalid radical ID", 400);
  }

  const radical = await Radical.findById(id);

  if (!radical) {
    throwError("Radical not found", 404);
  }

  const isUsed = await Kanji.exists({
    radicalId: id,
  });

  if (isUsed) {
    throwError(
      "Cannot delete radical because it is being used by kanji",
      409
    );
  }

  await Radical.findByIdAndDelete(id);

  return radical;
};
