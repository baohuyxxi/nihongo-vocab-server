import vocabRoutes from "./vocab.routes.js";
import lessonRoutes from "./lesson.routes.js";
import cloudinaryRoutes from "./cloudinary.routes.js";
import grammarRoutes from "./grammar.routes.js";
import kanjiRoutes from "./kanji.routes.js";
import kanjiReviewRoutes from "./kanjiReview.routes.js";
import kanjiCurriculumRoutes from "./kanjiCurriculum.routes.js";
import kanjiVocabularyRoutes from "./kanjiVocabulary.routes.js";
import radicalRoutes from "./radical.routes.js";

const route = (app) => {
  app.use("/api/vocab", vocabRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/cloudinary", cloudinaryRoutes);
  app.use("/api/grammar", grammarRoutes);
  app.use("/api/kanji", kanjiReviewRoutes);
  app.use("/api/kanji", kanjiRoutes);
  app.use("/api/kanji-curriculum", kanjiCurriculumRoutes);
  app.use("/api/kanji-vocabulary", kanjiVocabularyRoutes);
  app.use("/api/radicals", radicalRoutes);
};

export default route;
