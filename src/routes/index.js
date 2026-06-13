import vocabRoutes from "./vocab.routes.js";
import lessonRoutes from "./lesson.routes.js";
import cloudinaryRoutes from "./cloudinary.routes.js";
import grammarRoutes from "./grammar.routes.js";

const route = (app) => {
  app.use("/api/vocab", vocabRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/cloudinary", cloudinaryRoutes);
  app.use("/api/grammar", grammarRoutes);
};

export default route;
