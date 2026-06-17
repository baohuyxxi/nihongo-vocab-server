import Grammar from "../models/Grammar.js"
import {
    successResponse,
    errorResponse,
} from "../utils/response.js"
import mongoose from "mongoose";
/* =========================
   GET ALL + FILTER
========================= */

export const getAllGrammar = async (req, res) => {
    try {

        const { lesson } = req.query

        const query = {}

        if (lesson) {
            query.lesson = Number(lesson)
        }

        const data = await Grammar
            .find(query)
            .sort({
                lesson: 1,
                order: 1,
            })

        return successResponse(
            res,
            data,
            "Lấy tất cả ngữ pháp thành công",
            {
                total: data.length,
            }
        )

    } catch (err) {
        return errorResponse(res, err.message)
    }
}

/* =========================
   GET BY ID
========================= */

export const getGrammarById = async (req, res) => {
    try {

        const data = await Grammar.findById(req.params.id)

        if (!data) {
            return errorResponse(
                res,
                "Không tìm thấy ngữ pháp",
                404
            )
        }

        return successResponse(
            res,
            data,
            "Lấy chi tiết ngữ pháp thành công"
        )

    } catch (err) {
        return errorResponse(res, err.message)
    }
}

/* =========================
   CREATE
========================= */

export const createGrammar = async (req, res) => {
    try {

        const data = await Grammar.create(req.body)

        return successResponse(
            res,
            data,
            "Tạo ngữ pháp thành công"
        )

    } catch (err) {
        return errorResponse(res, err.message, 400)
    }
}

/* =========================
   UPDATE
========================= */

export const updateGrammar = async (req, res) => {
    try {
        const body = req.body;

        // ❗ chống lỗi nếu FE gửi array
        const updateData = Array.isArray(body) ? body[0] : body;

        const data = await Grammar.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!data) {
            return errorResponse(res, "Không tìm thấy ngữ pháp", 404);
        }

        return successResponse(res, data, "Cập nhật ngữ pháp thành công");
    } catch (err) {
        return errorResponse(res, err.message, 400);
    }
};

/* =========================
   DELETE
========================= */

export const deleteGrammar = async (req, res) => {
    try {

        const data = await Grammar.findByIdAndDelete(req.params.id)

        if (!data) {
            return errorResponse(
                res,
                "Không tìm thấy ngữ pháp",
                404
            )
        }

        return successResponse(
            res,
            null,
            "Xóa ngữ pháp thành công"
        )

    } catch (err) {
        return errorResponse(res, err.message)
    }
}

/* =========================
   BULK SAVE
========================= */

export const bulkSaveGrammar = async (req, res) => {
    try {

        const grammars = req.body

        if (!Array.isArray(grammars)) {
            return errorResponse(
                res,
                "Dữ liệu phải là mảng",
                400
            )
        }

        const operations = grammars.map((item) => {

            if (item._id) {
                return {
                    updateOne: {
                        filter: { _id: item._id },
                        update: { $set: item },
                    },
                }
            }

            return {
                insertOne: {
                    document: item,
                },
            }

        })

        await Grammar.bulkWrite(operations)

        return successResponse(
            res,
            null,
            "Lưu danh sách ngữ pháp thành công",
            {
                total: grammars.length,
            }
        )

    } catch (err) {
        return errorResponse(res, err.message)
    }
}

export const getGrammarByLesson = async (req, res) => {
  try {
    const lesson = Number(req.params.lesson)

    if (isNaN(lesson)) {
      return errorResponse(res, "Lesson không hợp lệ", 400)
    }

    const data = await Grammar.find({ lesson }).sort({
      order: 1,
    })

    return successResponse(
      res,
      data,
      `Lấy ngữ pháp bài ${lesson} thành công`,
      {
        total: data.length,
      }
    )
  } catch (err) {
    return errorResponse(res, err.message)
  }
}

export const migrateGrammarLinks = async (req, res) => {
    try {

        const collection =
            mongoose.connection.collection("grammars");

        const grammars =
            await collection.find({}).toArray();

        let updated = 0;

        for (const grammar of grammars) {

            let changed = false;

            const structure =
                (grammar.structure || []).map(node => {

                    // links kiểu cũ
                    if (
                        Array.isArray(node.links) &&
                        node.links.length > 0 &&
                        typeof node.links[0] === "object" &&
                        node.links[0] !== null &&
                        "to" in node.links[0]
                    ) {

                        changed = true;

                        return {
                            ...node,
                            links: node.links
                                .map(link => link.to)
                                .filter(to => to !== undefined),
                        };
                    }

                    return node;
                });

            if (changed) {

                await collection.updateOne(
                    { _id: grammar._id },
                    {
                        $set: {
                            structure,
                        },
                    }
                );

                updated++;
            }
        }

        return res.json({
            success: true,
            message: `Đã migrate ${updated} grammar`,
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};