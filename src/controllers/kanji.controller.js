
import * as kanjiService from "../services/kanji.service.js";
import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

const handleError = (res, error) => {
  console.error("Kanji controller:", error);

  return errorResponse(
    res,
    error.message || "Server error",
    error.status || 500
  );
};

// GET /api/kanji
export const getAllKanji = async (req, res) => {
  try {
    const result = await kanjiService.getAllKanji(req.query);

    return successResponse(
      res,
      result.data,
      "Get kanji successfully",
      { pagination: result.pagination }
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/kanji/:id
export const getKanjiById = async (req, res) => {
  try {
    const data = await kanjiService.getKanjiById(req.params.id);

    return successResponse(
      res,
      data,
      "Get kanji successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/kanji/:id/vocabulary
export const getKanjiVocabulary = async (req, res) => {
  try {
    const result = await kanjiService.getKanjiVocabulary(
      req.params.id,
      req.query
    );

    return successResponse(
      res,
      result.data,
      "Get kanji vocabulary successfully",
      { pagination: result.pagination }
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /api/kanji
export const createKanji = async (req, res) => {
  try {
    const data = await kanjiService.createKanji(req.body);

    return successResponse(
      res,
      data,
      "Create kanji successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// PUT /api/kanji/:id
export const updateKanji = async (req, res) => {
  try {
    const data = await kanjiService.updateKanji(
      req.params.id,
      req.body
    );

    return successResponse(
      res,
      data,
      "Update kanji successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE /api/kanji/:id
export const deleteKanji = async (req, res) => {
  try {
    const data = await kanjiService.deleteKanji(req.params.id);

    return successResponse(
      res,
      data,
      "Delete kanji successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};
