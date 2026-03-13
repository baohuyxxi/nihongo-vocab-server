import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,   // phải truyền object cloudinary
  params: {
    folder: "japanese-vocab",
    allowed_formats: ["jpg", "png", "jpeg", "mp4", "webp"]
  }
});

const upload = multer({ storage });

export default upload;
