import vocabRoutes from "./vocab.routes.js";
import lessonRoutes from "./lesson.routes.js";

const route = (app) => {
  app.use("/api/vocab", vocabRoutes);
  app.use("/api/lessons", lessonRoutes);
};

export default route;
