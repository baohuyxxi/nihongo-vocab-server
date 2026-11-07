import { successResponse, errorResponse } from "../utils/response.js";
import * as vocabService from "../services/vocab.service.js";

/* =========================
   BASIC VOCAB APIs
========================= */

export const getAllVocab = async (req, res) => {
  try {
    const data = await vocabService.getAllVocab();

    return successResponse(
      res,
      data,
      "Lấy tất cả từ vựng thành công",
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const getVocabByLesson = async (req, res) => {
  try {
    const lesson = Number(req.params.lesson);

    const data = await vocabService.getVocabByLesson(lesson);

    return successResponse(
      res,
      data,
      `Lấy từ vựng bài ${lesson} thành công`,
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const getVocabByLessons = async (req, res) => {
  try {
    const lessons = req.query.lessons.split(",").map(Number);

    const data = await vocabService.getVocabByLessons(lessons);

    return successResponse(
      res,
      data,
      "Lấy từ vựng theo nhiều bài thành công",
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const getVocabByUnit = async (req, res) => {
  try {
    const { unit, n3Topic = "" } = req.query;
    const unitNumber = Number(unit);

    if (
      !Number.isInteger(unitNumber) ||
      unitNumber < 1 ||
      unitNumber > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit không hợp lệ",
      });
    }

    const data = await vocabService.getVocabByUnit(
      unitNumber,
      n3Topic
    );

    return successResponse(
      res,
      data,
      `Lấy từ vựng Unit ${unitNumber} thành công`,
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const getVocabByTopic = async (req, res) => {
  try {
    const { topics } = req.query;

    if (!topics) {
      return errorResponse(res, "Thiếu topics");
    }

    const topicArr = topics
      .split(",")
      .map((t) => t.toLowerCase().trim());

    const data = await vocabService.getVocabByTopic(topicArr);

    return successResponse(
      res,
      data,
      "Lấy từ vựng theo topic thành công",
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/* =========================
   REVIEW SESSION
========================= */

export const reviewSession = async (req, res) => {
  try {
    const result = await vocabService.createReviewSession(req.query);

    if (result.error) {
      return errorResponse(res, result.error);
    }

    return successResponse(
      res,
      result.data,
      result.message,
      result.meta
    );
  } catch (err) {
    console.error("reviewSession:", err);
    return errorResponse(res, err.message);
  }
};

export const completeReviewVocab = async (req, res) => {
  try {
    const { reviewId, vocabId } = req.params;

    if (!reviewId) {
      return errorResponse(res, "Thiếu reviewId");
    }

    if (!vocabId) {
      return errorResponse(res, "Thiếu vocabId");
    }

    const data = await vocabService.completeReviewVocab(
      reviewId,
      vocabId
    );

    if (!data) {
      return errorResponse(
        res,
        "Review session không tồn tại hoặc đã hết hạn"
      );
    }

    return successResponse(
      res,
      data,
      "Đã hoàn thành từ vựng"
    );
  } catch (err) {
    console.error("completeReviewVocab:", err);
    return errorResponse(res, err.message);
  }
};

/* =========================
   CRUD VOCAB
========================= */

export const createVocab = async (req, res) => {
  try {
    const data = await vocabService.createVocab(req.body);

    return successResponse(
      res,
      data,
      "Thêm từ vựng thành công"
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const updateVocab = async (req, res) => {
  try {
    const data = await vocabService.updateVocab(
      req.params.id,
      req.body
    );

    return successResponse(
      res,
      data,
      "Cập nhật từ vựng thành công"
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const deleteVocab = async (req, res) => {
  try {
    await vocabService.deleteVocab(req.params.id);

    return successResponse(
      res,
      null,
      "Xoá từ vựng thành công"
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const createManyVocab = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return errorResponse(res, "Body phải là mảng từ vựng");
    }

    const data = await vocabService.createManyVocab(req.body);

    return successResponse(
      res,
      data,
      "Thêm nhiều từ vựng thành công",
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const bulkUpdateVocab = async (req, res) => {
  try {
    await vocabService.bulkUpdateVocab(req.body);

    return successResponse(
      res,
      null,
      "Lưu tất cả từ vựng thành công"
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/* =========================
   OTHER VOCAB APIs
========================= */

export const getAllVerbs = async (req, res) => {
  try {
    const data = await vocabService.getAllVerbs();

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getVocabByPartOfSpeech = async (req, res) => {
  try {
    const { pos } = req.params;

    const validTypes = [
      "noun",
      "verb_g_1",
      "verb_g_2",
      "verb_g_3",
      "adj_i",
      "adj_na",
      "adverb",
      "conjunction",
      "pronoun",
      "interjection",
      "expression",
      "counter",
      "prefix",
      "suffix",
    ];

    if (!validTypes.includes(pos)) {
      return res.status(400).json({
        success: false,
        message: "partOfSpeech không hợp lệ",
      });
    }

    const [data, total] = await Promise.all([
      vocabService.getVocabByPartOfSpeech(pos),
      vocabService.countVocabByPartOfSpeech(pos),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lọc từ vựng theo partOfSpeech thành công",
      total,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getTest = async (req, res) => {
  try {
    const data = await vocabService.getTest();

    return successResponse(
      res,
      data,
      "Lấy 50 từ vựng chưa có hoặc có loại từ không hợp lệ thành công",
      { total: data.length }
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

export const getVocabWithoutImage = async (req, res) => {
  try {
    const { result, remaining } =
      await vocabService.getVocabWithoutImage();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không còn danh từ nào chưa có ảnh",
        data: null,
        remaining: 0,
      });
    }

    return res.json({
      success: true,
      message: "Lấy từ vựng chưa có ảnh thành công",
      data: result,
      remaining,
    });
  } catch (err) {
    console.error("getVocabWithoutImage:", err);

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  }
};