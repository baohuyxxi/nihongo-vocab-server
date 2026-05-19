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
  createManyVocab,
  getVocabByTopic,
  getAllVerbs,
  getTest,
  getVocabByPartOfSpeech
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

router.get("/topic", getVocabByTopic)

router.get("/verbs", getAllVerbs)

router.get("/test", getTest)
router.get("/part-of-speech/:pos", getVocabByPartOfSpeech)
export default router
