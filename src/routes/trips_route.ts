import express from "express";
const router = express.Router();
import authMiddleware from "../common/auth_middleware";
import TripController from "../controllers/trips_controller";

router.get("/", TripController.get.bind(TripController));
router.get("/:id", authMiddleware, TripController.get.bind(TripController));
router.post("/", authMiddleware, TripController.post.bind(TripController));
router.put("/:id", authMiddleware, TripController.put.bind(TripController));
router.delete(
  "/:id",
  authMiddleware,
  TripController.delete.bind(TripController)
);

router.get(
  "/owner/:id",
  authMiddleware,
  TripController.getByOwnerId.bind(TripController)
);
router.get(
  "/FullTrip/:id",
  authMiddleware,
  TripController.getWithComments.bind(TripController)
);

router.post(
  "/:tripId/comments",
  authMiddleware,
  TripController.addComment.bind(TripController)
);
router.delete(
  "/:tripId/:commentId",
  authMiddleware,
  TripController.deleteComment.bind(TripController)
);
router.post(
  "/:tripId/likes",
  authMiddleware,
  TripController.addLike.bind(TripController)
);
router.get(
  "/search/parameters",
  authMiddleware,
  TripController.getByParamId.bind(TripController)
);
export default router;
