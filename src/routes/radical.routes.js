import express from "express";
import {
  getAllRadicals,
  getRadicalById,
  createRadical,
  updateRadical,
  deleteRadical,
} from "../controllers/radical.controller.js";

const router = express.Router();

router.get("/", getAllRadicals);
router.get("/:id", getRadicalById);
router.post("/", createRadical);
router.put("/:id", updateRadical);
router.delete("/:id", deleteRadical);

export default router;