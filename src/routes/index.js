import vocabRoutes from "./vocab.routes.js";
import lessonRoutes from "./lesson.routes.js";
import cloudinaryRoutes from "./cloudinary.routes.js";

const route = (app) => {
  app.use("/api/vocab", vocabRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/cloudinary", cloudinaryRoutes);
};

export default route;
