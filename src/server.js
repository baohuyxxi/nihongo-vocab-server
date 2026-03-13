import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import connectDB from './config/db.js'
import initCloudinary from './config/cloudinary.js'
import route from "./routes/index.js";

dotenv.config()

connectDB()
initCloudinary()

const app = express()

app.use(cors())
app.use(express.json())

route(app)

const PORT = process.env.PORT || 6000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})