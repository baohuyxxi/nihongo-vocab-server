import mongoose from "mongoose"

const reviewHistorySchema =
  new mongoose.Schema(
    {
      configKey: {
        type: String,
        index: true,
      },

      // Các từ còn lại trong session
      vocabIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vocabulary",
        },
      ],
    },
    {
      timestamps: true,
    }
  )

reviewHistorySchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds:
      3 * 24 * 60 * 60,
  }
)

export default mongoose.model(
  "ReviewHistory",
  reviewHistorySchema
)