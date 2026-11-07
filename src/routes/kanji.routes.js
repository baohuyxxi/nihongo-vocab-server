import express from "express";
import {
  getAllKanji,
  getKanjiById,
  createKanji,
  updateKanji,
  deleteKanji,
} from "../controllers/kanji.controller.js";

const router = express.Router();

router.get("/", getAllKanji);
router.get("/:id", getKanjiById);
router.post("/", createKanji);
router.put("/:id", updateKanji);
router.delete("/:id", deleteKanji);

export default router;