import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";

const initCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET
    });

    console.log("✅ Cloudinary configured");
  } catch (error) {
    console.error("❌ Cloudinary config failed:", error.message);
    process.exit(1);
  }
};


export { cloudinary };
export default initCloudinary;