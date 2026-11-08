import express from "express";
import {
  getOverview,
  getEntries,
  getEntry,
  importEntries,
} from "../controllers/kanjiCurriculum.controller.js";

const router = express.Router();

router.get("/", getOverview);
router.get("/entries", getEntries);
router.get("/entries/:id", getEntry);
router.post("/import", importEntries);

export default router;
