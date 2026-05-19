// src/routes/lesson.routes.js

import express from "express"

import {
  getLessons,
  getLessonDetail,
  getAllAdverbs,
  getAdverbsGrouped,
  getDuplicateHiragana,
} from "../controllers/lesson.controller.js"

const router = express.Router()

/* ✅ PHÓ TỪ */
router.get("/adverbs/all", getAllAdverbs)

router.get(
  "/adverbs/grouped",
  getAdverbsGrouped
)

/* ✅ TỪ ĐỒNG HIRAGANA */
router.get(
  "/duplicate-hiragana",
  getDuplicateHiragana
)

/* ✅ LESSON */
router.get("/", getLessons)

router.get("/:lesson", getLessonDetail)

export default router