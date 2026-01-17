import express from "express"
import {
  getAllVocab,
  getVocabByLesson,
  getVocabByLessons,
  reviewSession,
  updateVocab,
  bulkUpdateVocab,
  createVocab,
  deleteVocab,
  createManyVocab
} from "../controllers/vocab.controller.js"

const router = express.Router()

/* BASIC */
router.get("/", getAllVocab)
router.get("/lesson/:lesson", getVocabByLesson)
router.get("/lessons", getVocabByLessons)


/* REVIEW */
router.get("/review-session", reviewSession)

/* ===== EDIT VOCAB (EXCEL MODE) ===== */
router.post("/", createVocab)
router.put("/:id", updateVocab)
router.put("/bulk/save", bulkUpdateVocab)
router.delete("/:id", deleteVocab)

/* ===== CREATE MANY ===== */
router.post("/bulk/create", createManyVocab)


export default router
