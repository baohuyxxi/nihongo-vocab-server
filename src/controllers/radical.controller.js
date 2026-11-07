
import * as radicalService from "../services/radical.service.js";
import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

const handleError = (res, error) => {
  console.error("Radical controller:", error);

  return errorResponse(
    res,
    error.message || "Server error",
    error.status || 500
  );
};

// GET /api/radicals
export const getAllRadicals = async (req, res) => {
  try {
    const result = await radicalService.getAllRadicals(req.query);

    return successResponse(
      res,
      result.data,
      "Get radicals successfully",
      { pagination: result.pagination }
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/radicals/:id
export const getRadicalById = async (req, res) => {
  try {
    const data = await radicalService.getRadicalById(
      req.params.id
    );

    return successResponse(
      res,
      data,
      "Get radical successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/radicals/:id/kanji
export const getRadicalKanji = async (req, res) => {
  try {
    const result = await radicalService.getRadicalKanji(
      req.params.id,
      req.query
    );

    return successResponse(
      res,
      result.data,
      "Get radical kanji successfully",
      { pagination: result.pagination }
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /api/radicals
export const createRadical = async (req, res) => {
  try {
    const data = await radicalService.createRadical(req.body);

    return successResponse(
      res,
      data,
      "Create radical successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// PUT /api/radicals/:id
export const updateRadical = async (req, res) => {
  try {
    const data = await radicalService.updateRadical(
      req.params.id,
      req.body
    );

    return successResponse(
      res,
      data,
      "Update radical successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE /api/radicals/:id
export const deleteRadical = async (req, res) => {
  try {
    const data = await radicalService.deleteRadical(
      req.params.id
    );

    return successResponse(
      res,
      data,
      "Delete radical successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};
