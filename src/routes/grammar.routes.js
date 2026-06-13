import express from "express"

import {
    getAllGrammar,
    getGrammarById,
    getGrammarByLesson,   // thêm cái này
    createGrammar,
    updateGrammar,
    deleteGrammar,
    bulkSaveGrammar,
} from "../controllers/grammar.controller.js"

const router = express.Router()

/* =======================
 * QUERY
 * ======================= */

// GET ALL
router.get("/", getAllGrammar)
// GET BY ID (Mongo ObjectId)
router.get("/:id", getGrammarById)
// ❗ FIX: phải để route lesson TRƯỚC /:id nếu dùng chung prefix
router.get("/lesson/:lesson", getGrammarByLesson)

/* =======================
 * CREATE
 * ======================= */
router.post("/", createGrammar)
/* =======================
 * UPDATE
 * ======================= */
router.put("/:id", updateGrammar)
/* =======================
 * DELETE
 * ======================= */
router.delete("/:id", deleteGrammar)
/* =======================
 * BULK SAVE
 * ======================= */
router.post("/bulk-save", bulkSaveGrammar)

export default router