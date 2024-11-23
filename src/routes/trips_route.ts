import express from "express";
const router = express.Router();
import authMiddleware, {
  optionalAuthMiddleware,
} from "../common/auth_middleware";
import TripController from "../controllers/trips_controller";

/**
 * @swagger
 * /trips:
 *   get:
 *     summary: Get all trips
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: List of all trips
 */
router.get(
  "/",
  optionalAuthMiddleware,
  TripController.getAllTrips.bind(TripController)
);

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a new trip
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       500:
 *         description: Server error
 */
// router.post("/", authMiddleware, TripController.post.bind(TripController));

/**
 * @swagger
 * /trips/{id}:
 *   put:
 *     summary: Update a trip by ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the trip to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       404:
 *         description: Trip not found
 */
router.put(
  "/:id",
  authMiddleware,
  TripController.updateTrip.bind(TripController)
);

/**
 * @swagger
 * /trips/{id}:
 *   delete:
 *     summary: Delete a trip by ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the trip to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *       404:
 *         description: Trip not found
 */
router.delete(
  "/:id",
  authMiddleware,
  TripController.deleteTrip.bind(TripController)
);

/**
 * @swagger
 * /trips/owner/{id}:
 *   get:
 *     summary: Get trips by owner ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the owner to get trips for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of trips by owner
 */
router.get(
  "/owner/:id",
  authMiddleware,
  TripController.getByOwnerId.bind(TripController)
);

/**
 * @swagger
 * /trips/favorites:
 *   get:
 *     summary: Get favorite trips for the authenticated user
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: List of favorite trips
 *       404:
 *         description: No favorite trips found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/favorites/:userId",
  authMiddleware,
  TripController.getFavoriteTrips.bind(TripController)
);

/**
 * @swagger
 * /trips/FullTrip/{id}:
 *   get:
 *     summary: Get trip with all comments and likes by trip ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the trip
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip details with comments and likes
 *       404:
 *         description: Trip not found
 */
router.get(
  "/FullTrip/:id",
  optionalAuthMiddleware,
  TripController.getWithComments.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/comments:
 *   post:
 *     summary: Add a comment to a trip
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: ID of the trip to comment on
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       404:
 *         description: Trip not found
 */
router.post(
  "/:tripId/comments",
  authMiddleware,
  TripController.addComment.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/{commentId}:
 *   delete:
 *     summary: Delete a comment from a trip
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: ID of the trip
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         description: ID of the comment to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       404:
 *         description: Trip or comment not found
 */
router.delete(
  "/:tripId/:commentId",
  authMiddleware,
  TripController.deleteComment.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/likes:
 *   post:
 *     summary: Add or remove a like from a trip
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: ID of the trip to like or unlike
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like added or removed successfully
 *       404:
 *         description: Trip not found
 */
router.post(
  "/:tripId/likes",
  authMiddleware,
  TripController.addLike.bind(TripController)
);

/**
 * @swagger
 * /trips/search/parameters:
 *   get:
 *     summary: Search trips by parameters
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: typeTraveler
 *         description: Type of traveler
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         description: Country of the trip
 *         schema:
 *           type: string
 *       - in: query
 *         name: typeTrip
 *         description: Type of trip
 *         schema:
 *           type: string
 *       - in: query
 *         name: numOfDays
 *         description: Number of days of the trip
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of trips matching parameters
 *       400:
 *         description: No valid query parameters provided
 *       404:
 *         description: No trips found
 */
router.get(
  "/search/parameters",
  optionalAuthMiddleware,
  TripController.getByParamId.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/likes/details:
 *   get:
 *     summary: Get details of users who liked a trip
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: ID of the trip to retrieve like details for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users who liked the trip with their details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLikes:
 *                   type: integer
 *                   description: Total number of likes
 *                 likesDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userName:
 *                         type: string
 *                         description: User's name who liked the trip
 *                       imgUrl:
 *                         type: string
 *                         description: URL of the user's profile picture
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:tripId/likes/details",
  authMiddleware,
  TripController.getLikesWithUserDetails.bind(TripController)
);

export default router;
