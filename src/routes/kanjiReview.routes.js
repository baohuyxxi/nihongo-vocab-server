import express from "express";
import {
  getReviewSession,
  completeReview,
} from "../controllers/kanjiReview.controller.js";

const router = express.Router();

router.get("/review-session", getReviewSession);
router.post("/review-session/complete", completeReview);

export default router;
