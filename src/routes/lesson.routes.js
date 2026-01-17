import express from "express";
import Lesson from "../models/Lesson.js";

const router = express.Router();

/**
 * ✅ Danh sách bài Minna
 * GET /api/lessons
 */
router.get("/", async (req, res) => {
  const lessons = await Lesson.find().sort({ number: 1 });
  res.json(lessons);
});

/**
 * ✅ Chi tiết 1 bài
 * GET /api/lessons/5
 */
router.get("/:lesson", async (req, res) => {
  const lesson = Number(req.params.lesson);
  const data = await Lesson.findOne({ number: lesson });
  res.json(data);
});

export default router;
