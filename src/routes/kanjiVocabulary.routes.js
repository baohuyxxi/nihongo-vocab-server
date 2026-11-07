import express from "express";
import {
  getAllKanjiVocabulary,
  getKanjiVocabularyById,
  createKanjiVocabulary,
  updateKanjiVocabulary,
  deleteKanjiVocabulary,
} from "../controllers/kanjiVocabulary.controller.js";

const router = express.Router();

router.get("/", getAllKanjiVocabulary);
router.get("/:id", getKanjiVocabularyById);
router.post("/", createKanjiVocabulary);
router.put("/:id", updateKanjiVocabulary);
router.delete("/:id", deleteKanjiVocabulary);

export default router;