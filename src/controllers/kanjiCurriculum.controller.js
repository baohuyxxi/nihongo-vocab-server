import {
  ensureAdminAccess,
  getCurriculumOverview,
  getEntriesByWeekAndDay,
  getEntryById,
  importCurriculumEntries,
} from "../services/kanjiCurriculum.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const handleError = (res, error) => {
  console.error("Kanji curriculum controller:", error);
  return errorResponse(
    res,
    error.message || "Server error",
    error.status || 500
  );
};

export const getOverview = async (req, res) => {
  try {
    const data = await getCurriculumOverview();
    return successResponse(res, data, "Get curriculum overview successfully");
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEntries = async (req, res) => {
  try {
    const data = await getEntriesByWeekAndDay(req.query);
    return successResponse(
      res,
      data,
      "Get curriculum entries successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEntry = async (req, res) => {
  try {
    const data = await getEntryById(req.params.id);
    return successResponse(
      res,
      data,
      "Get curriculum entry successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const importEntries = async (req, res) => {
  try {
    ensureAdminAccess(req);
    const data = await importCurriculumEntries(req.body);
    return successResponse(
      res,
      data,
      "Import curriculum entries successfully"
    );
  } catch (error) {
    return handleError(res, error);
  }
};
