import { Router } from "express";
import KaiwaDialogue from "../models/KaiwaDialogue.js";
import KaiwaQuestion from "../models/KaiwaQuestion.js";
import { createKaiwaContent } from "../services/kaiwaAdmin.service.js";
import { ensureAdminAccess } from "../services/kanjiCurriculum.service.js";
import { errorResponse, successResponse } from "../utils/response.js";
import {
  completeSession, createSession, getDialogue, getSession, listDialogues, listQuestions, saveAnswer,
} from "../services/kaiwa.service.js";

const router = Router();

const handle = (run, createdMessage) => async (req, res) => {
  try {
    const data = await run(req);
    if (createdMessage) return res.status(201).json({ success: true, message: createdMessage, data });
    return successResponse(res, data);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    if (error.code === 11000) return errorResponse(res, "Duplicate record", 409);
    if (["ValidationError", "CastError", "StrictModeError"].includes(error.name)) {
      return errorResponse(res, "Invalid Kaiwa data", 400);
    }
    console.error("Kaiwa request failed", error.name);
    return errorResponse(res);
  }
};

router.get("/dialogues", handle((req) => listDialogues(req.query)));
router.get("/dialogues/:id", handle((req) => getDialogue(req.params.id)));
router.get("/questions", handle((req) => listQuestions(req.query)));

const createAdminRecord = (model, message) => handle((req) => {
  ensureAdminAccess(req);
  return createKaiwaContent(model, req.body);
}, message);

router.post("/admin/dialogues", createAdminRecord(KaiwaDialogue, "Dialogue created"));
router.post("/admin/questions", createAdminRecord(KaiwaQuestion, "Question created"));

router.use("/practice-sessions", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/practice-sessions", handle((req) => createSession(req.body), "Session created"));
router.get("/practice-sessions/:id", handle((req) => getSession(req.params.id, req.get("Authorization"))));
router.patch("/practice-sessions/:id", handle((req) => saveAnswer(req.params.id, req.get("Authorization"), req.body)));
router.post("/practice-sessions/:id/complete", handle((req) => completeSession(req.params.id, req.get("Authorization"), req.body)));

export default router;
