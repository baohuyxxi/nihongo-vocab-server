import { successResponse, errorResponse } from "../utils/response.js";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, "Không có file upload");
    }

    const { path, filename, mimetype, size } = req.file;

    return successResponse(
      res,
      {
        url: path,
        public_id: filename,
        type: mimetype,
        size: size
      },
      "Upload thành công"
    );

  } catch (err) {
    return errorResponse(res, err.message);
  }
};