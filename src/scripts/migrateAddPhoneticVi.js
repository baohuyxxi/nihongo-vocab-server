import mongoose from "mongoose"
import Vocabulary from "../models/Vocabulary.js"
import connectDB from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

await connectDB();


const result = await Vocabulary.updateMany(
  {}, // filter: tất cả
  {
    $set: {
      romaji: "",
      example: { jp: "", vi: "" },
      audio: ""
    }
  }
)


console.log("Updated:", result.modifiedCount)
process.exit()
