import {
  createReviewSession,
  completeReviewSession,
} from "../services/kanjiReview.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const handleError = (res, error) => {
  console.error("Kanji review controller:", error);
  return errorResponse(
    res,
    error.message || "Server error",
    error.status || 500
  );
};

export const getReviewSession = async (req, res) => {
  try {
    const result = await createReviewSession(req.query);

    return successResponse(
      res,
      result.data,
      `Get ${result.mode} review session successfully`,
      result.meta
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const completeReview = async (req, res) => {
  try {
    const result = await completeReviewSession({
      ...req.body,
      ...req.query,
    });

    return successResponse(
      res,
      result.data,
      result.message,
      { reviewId: result.data.reviewId }
    );
  } catch (error) {
    return handleError(res, error);
  }
};
