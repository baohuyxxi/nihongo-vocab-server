import express from "express"
import {
  getLessons,
  getLessonDetail,
  getAllAdverbs,
  getAdverbsGrouped
} from "../controllers/lesson.controller.js"

const router = express.Router()

router.get("/", getLessons)
router.get("/:lesson", getLessonDetail)

/* ✅ PHÓ TỪ */
router.get("/adverbs/all", getAllAdverbs)
router.get("/adverbs/grouped", getAdverbsGrouped) // 🔥 QUAN TRỌNG

export default router