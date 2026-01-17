import mongoose from 'mongoose'

const lessonSchema = new mongoose.Schema({
  lessonNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  title: String,
})

export default mongoose.model('Lesson', lessonSchema)
