
import * as kanjiVocabularyService from "../services/kanjiVocabulary.service.js";
import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

const handleError = (res, error) => {
  console.error("KanjiVocabulary controller:", error);

  return errorResponse(
    res,
    error.message || "Server error",
    error.status || 500
  );
};

// GET /api/kanji-vocabulary
export const getAllKanjiVocabulary = async (req, res) => {
  try {
    const result =
      await kanjiVocabularyService.getAllKanjiVocabulary(
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

// GET /api/kanji-vocabulary/:id
export const getKanjiVocabularyById = async (req, res) => {
  try {
    const data =
      await kanjiVocabularyService.getKanjiVocabularyById(
        req.params.id
      );

    return successResponse(
      res,
      data,
      "Get kanji vocabulary successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /api/kanji-vocabulary
export const createKanjiVocabulary = async (req, res) => {
  try {
    const data =
      await kanjiVocabularyService.createKanjiVocabulary(
        req.body
      );

    return successResponse(
      res,
      data,
      "Create kanji vocabulary successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// PUT /api/kanji-vocabulary/:id
export const updateKanjiVocabulary = async (req, res) => {
  try {
    const data =
      await kanjiVocabularyService.updateKanjiVocabulary(
        req.params.id,
        req.body
      );

    return successResponse(
      res,
      data,
      "Update kanji vocabulary successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE /api/kanji-vocabulary/:id
export const deleteKanjiVocabulary = async (req, res) => {
  try {
    const data =
      await kanjiVocabularyService.deleteKanjiVocabulary(
        req.params.id
      );

    return successResponse(
      res,
      data,
      "Delete kanji vocabulary successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};
