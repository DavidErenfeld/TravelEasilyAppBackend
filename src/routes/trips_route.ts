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
 *     description: Retrieves a list of all trips, including their details, likes, and comments. If a user is authenticated, it also returns whether the user liked or favorited each trip.
 *     tags: [trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all trips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174001"
 *                   typeTraveler:
 *                     type: string
 *                     example: "Family"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   typeTrip:
 *                     type: string
 *                     example: "Road Trip"
 *                   tripDescription:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                   numOfComments:
 *                     type: integer
 *                     example: 5
 *                   numOfLikes:
 *                     type: integer
 *                     example: 20
 *                   tripPhotos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                   owner:
 *                     type: object
 *                     properties:
 *                       userName:
 *                         type: string
 *                         example: "John Doe"
 *                       imgUrl:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                   comments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "123e4567-e89b-12d3-a456-426614174002"
 *                         owner:
 *                           type: string
 *                           example: "Jane Doe"
 *                         comment:
 *                           type: string
 *                           example: "This was an amazing trip!"
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2024-11-23"
 *                   isLikedByCurrentUser:
 *                     type: boolean
 *                     example: true
 *                   isFavoritedByCurrentUser:
 *                     type: boolean
 *                     example: false
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error retrieving data"
 *                 error:
 *                   type: string
 */
router.get(
  "/",
  optionalAuthMiddleware,
  TripController.getAllTrips.bind(TripController)
);

/**
 * @swagger
 * /trips/owner/{id}:
 *   get:
 *     summary: Get trips by owner ID
 *     description: Retrieves all trips created by a specific owner, including details about likes and comments. If the user is authenticated, it also includes whether the user liked or favorited each trip.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description: The ID of the owner to fetch trips for
 *     responses:
 *       200:
 *         description: List of trips by the specified owner
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174001"
 *                   typeTraveler:
 *                     type: string
 *                     example: "Family"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   typeTrip:
 *                     type: string
 *                     example: "Road Trip"
 *                   tripDescription:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                   numOfComments:
 *                     type: integer
 *                     example: 5
 *                   numOfLikes:
 *                     type: integer
 *                     example: 20
 *                   tripPhotos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                   owner:
 *                     type: object
 *                     properties:
 *                       userName:
 *                         type: string
 *                         example: "John Doe"
 *                       imgUrl:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                   comments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "123e4567-e89b-12d3-a456-426614174002"
 *                         owner:
 *                           type: string
 *                           example: "Jane Doe"
 *                         comment:
 *                           type: string
 *                           example: "This was an amazing trip!"
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2024-11-23"
 *                   isLikedByCurrentUser:
 *                     type: boolean
 *                     example: true
 *                   isFavoritedByCurrentUser:
 *                     type: boolean
 *                     example: false
 *       404:
 *         description: No trips found for the specified owner ID
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching trips by owner ID"
 */
router.get(
  "/owner/:id",
  authMiddleware,
  TripController.getByOwnerId.bind(TripController)
);

/**
 * @swagger
 * /trips/favorites/{userId}:
 *   get:
 *     summary: Get favorite trips for a user
 *     description: Retrieves all trips marked as favorite by a specific user. If the user is authenticated, the response includes additional details such as whether the authenticated user liked or favorited the trips.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description: The ID of the user whose favorite trips are being fetched
 *     responses:
 *       200:
 *         description: List of favorite trips for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174001"
 *                   typeTraveler:
 *                     type: string
 *                     example: "Family"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   typeTrip:
 *                     type: string
 *                     example: "Road Trip"
 *                   tripDescription:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                   numOfComments:
 *                     type: integer
 *                     example: 5
 *                   numOfLikes:
 *                     type: integer
 *                     example: 20
 *                   tripPhotos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                   owner:
 *                     type: object
 *                     properties:
 *                       userName:
 *                         type: string
 *                         example: "John Doe"
 *                       imgUrl:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                   comments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "123e4567-e89b-12d3-a456-426614174002"
 *                         owner:
 *                           type: string
 *                           example: "Jane Doe"
 *                         comment:
 *                           type: string
 *                           example: "This was an amazing trip!"
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2024-11-23"
 *                   isLikedByCurrentUser:
 *                     type: boolean
 *                     example: true
 *                   isFavoritedByCurrentUser:
 *                     type: boolean
 *                     example: true
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching favorite trips"
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
 *     summary: Get detailed information about a trip
 *     description: Retrieves full details of a specific trip by its ID, including the owner, comments, likes, and additional metadata such as whether the authenticated user liked or favorited the trip.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to retrieve
 *     responses:
 *       200:
 *         description: Detailed information about the trip
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174001"
 *                 typeTraveler:
 *                   type: string
 *                   example: "Family"
 *                 country:
 *                   type: string
 *                   example: "USA"
 *                 typeTrip:
 *                   type: string
 *                   example: "Road Trip"
 *                 tripDescription:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                 numOfComments:
 *                   type: integer
 *                   example: 5
 *                 numOfLikes:
 *                   type: integer
 *                   example: 20
 *                 tripPhotos:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                 owner:
 *                   type: object
 *                   properties:
 *                     userName:
 *                       type: string
 *                       example: "John Doe"
 *                     imgUrl:
 *                       type: string
 *                       example: "https://example.com/profile.jpg"
 *                     _id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                       description: Returned only if the authenticated user is the owner
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "123e4567-e89b-12d3-a456-426614174002"
 *                       owner:
 *                         type: string
 *                         example: "Jane Doe"
 *                       comment:
 *                         type: string
 *                         example: "This was an amazing trip!"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-11-23"
 *                 isLikedByCurrentUser:
 *                   type: boolean
 *                   example: true
 *                 isFavoritedByCurrentUser:
 *                   type: boolean
 *                   example: false
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching trip with comments"
 */
router.get(
  "/FullTrip/:id",
  optionalAuthMiddleware,
  TripController.getFullTrip.bind(TripController)
);

/**
 * @swagger
 * /trips/search/parameters:
 *   get:
 *     summary: Search trips by parameters
 *     description: Search for trips based on various parameters such as traveler type, country, trip type, and number of days. If the user is authenticated, additional details such as whether the trip is liked or favorited by the user will be included.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: typeTraveler
 *         schema:
 *           type: string
 *           example: "Family"
 *         description: Type of traveler (e.g., Family, Solo, Friends)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           example: "USA"
 *         description: Country of the trip
 *       - in: query
 *         name: typeTrip
 *         schema:
 *           type: string
 *           example: "Road Trip"
 *         description: Type of trip (e.g., Road Trip, Beach, Adventure)
 *       - in: query
 *         name: numOfDays
 *         schema:
 *           type: integer
 *           example: 7
 *         description: Number of days for the trip
 *     responses:
 *       200:
 *         description: List of trips matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "123e4567-e89b-12d3-a456-426614174001"
 *                       typeTraveler:
 *                         type: string
 *                         example: "Family"
 *                       country:
 *                         type: string
 *                         example: "USA"
 *                       typeTrip:
 *                         type: string
 *                         example: "Road Trip"
 *                       tripDescription:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                       numOfComments:
 *                         type: integer
 *                         example: 5
 *                       numOfLikes:
 *                         type: integer
 *                         example: 20
 *                       tripPhotos:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                       owner:
 *                         type: object
 *                         properties:
 *                           userName:
 *                             type: string
 *                             example: "John Doe"
 *                           imgUrl:
 *                             type: string
 *                             example: "https://example.com/profile.jpg"
 *                           _id:
 *                             type: string
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                             description: Returned only if the authenticated user is the owner
 *                       comments:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "123e4567-e89b-12d3-a456-426614174002"
 *                             owner:
 *                               type: string
 *                               example: "Jane Doe"
 *                             comment:
 *                               type: string
 *                               example: "This was an amazing trip!"
 *                             date:
 *                               type: string
 *                               format: date
 *                               example: "2024-11-23"
 *                       isLikedByCurrentUser:
 *                         type: boolean
 *                         example: true
 *                       isFavoritedByCurrentUser:
 *                         type: boolean
 *                         example: false
 *       404:
 *         description: No trips found matching the search criteria
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
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
 *     description: Retrieves the total number of likes for a specific trip and detailed information about the users who liked it.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to retrieve like details for
 *     responses:
 *       200:
 *         description: List of users who liked the trip along with total likes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLikes:
 *                   type: integer
 *                   example: 10
 *                 likesDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userName:
 *                         type: string
 *                         example: "John Doe"
 *                       imgUrl:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get(
  "/:tripId/likes/details",
  authMiddleware,
  TripController.getLikesWithUserDetails.bind(TripController)
);

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a new trip
 *     description: Allows an authenticated user to create a new trip with specified details.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               typeTraveler:
 *                 type: string
 *                 example: "Family"
 *                 description: The type of traveler (e.g., Family, Solo, Friends)
 *               country:
 *                 type: string
 *                 example: "USA"
 *                 description: The country where the trip takes place
 *               typeTrip:
 *                 type: string
 *                 example: "Road Trip"
 *                 description: The type of trip (e.g., Road Trip, Adventure, Beach)
 *               tripDescription:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                 description: A detailed description of the trip itinerary
 *               tripPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                 description: URLs of photos related to the trip
 *     responses:
 *       201:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174001"
 *                 typeTraveler:
 *                   type: string
 *                   example: "Family"
 *                 country:
 *                   type: string
 *                   example: "USA"
 *                 typeTrip:
 *                   type: string
 *                   example: "Road Trip"
 *                 tripDescription:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Day 1: Visit Grand Canyon", "Day 2: Explore Las Vegas"]
 *                 tripPhotos:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                 numOfComments:
 *                   type: integer
 *                   example: 0
 *                 numOfLikes:
 *                   type: integer
 *                   example: 0
 *                 owner:
 *                   type: object
 *                   properties:
 *                     userName:
 *                       type: string
 *                       example: "John Doe"
 *                     imgUrl:
 *                       type: string
 *                       example: "https://example.com/profile.jpg"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: User not authenticated"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 error:
 *                   type: string
 *                   example: "Detailed error message"
 */
router.post("/", authMiddleware, TripController.addTrip.bind(TripController));

/**
 * @swagger
 * /trips/{tripId}/comments:
 *   post:
 *     summary: Add a comment to a trip
 *     description: Allows an authenticated user to add a comment to a specific trip. The comment is saved, and the total number of comments for the trip is updated.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: object
 *                 properties:
 *                   owner:
 *                     type: string
 *                     example: "Jane Doe"
 *                     description: Name of the user adding the comment
 *                   comment:
 *                     type: string
 *                     example: "This trip was amazing!"
 *                     description: The content of the comment
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2024-11-24"
 *                     description: The date the comment was added
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174002"
 *                   owner:
 *                     type: string
 *                     example: "Jane Doe"
 *                   comment:
 *                     type: string
 *                     example: "This trip was amazing!"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2024-11-24"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error in addComment"
 */
router.post(
  "/:tripId/comments",
  authMiddleware,
  TripController.addComment.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/likes:
 *   post:
 *     summary: Add or remove a like from a trip
 *     description: Toggles a like for a specific trip. If the authenticated user has already liked the trip, the like will be removed. If not, a new like will be added.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to like or unlike
 *     responses:
 *       200:
 *         description: Like toggled successfully (added or removed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174001"
 *                 typeTraveler:
 *                   type: string
 *                   example: "Family"
 *                 country:
 *                   type: string
 *                   example: "USA"
 *                 typeTrip:
 *                   type: string
 *                   example: "Road Trip"
 *                 numOfLikes:
 *                   type: integer
 *                   example: 15
 *                 likes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       owner:
 *                         type: string
 *                         example: "123e4567-e89b-12d3-a456-426614174000"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error in addLike"
 */
router.post(
  "/:tripId/likes",
  authMiddleware,
  TripController.handleLike.bind(TripController)
);

/**
 * @swagger
 * /trips/{id}:
 *   put:
 *     summary: Update a trip by ID
 *     description: Allows an authenticated user to update a trip if they are the owner. Only specific fields can be updated.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               typeTraveler:
 *                 type: string
 *                 example: "Solo"
 *                 description: Updated type of traveler (e.g., Family, Solo, Friends)
 *               country:
 *                 type: string
 *                 example: "France"
 *                 description: Updated country of the trip
 *               typeTrip:
 *                 type: string
 *                 example: "Adventure"
 *                 description: Updated type of trip (e.g., Road Trip, Beach, Adventure)
 *               tripDescription:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Day 1: Visit the Eiffel Tower", "Day 2: Explore the Louvre"]
 *                 description: Updated trip description itinerary
 *               tripPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *                 description: Updated URLs of trip photos
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174001"
 *                 typeTraveler:
 *                   type: string
 *                   example: "Solo"
 *                 country:
 *                   type: string
 *                   example: "France"
 *                 typeTrip:
 *                   type: string
 *                   example: "Adventure"
 *                 tripDescription:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Day 1: Visit the Eiffel Tower", "Day 2: Explore the Louvre"]
 *                 tripPhotos:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
 *       403:
 *         description: User is not authorized to update this trip
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You are not authorized to update this trip"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error updating trip"
 *                 error:
 *                   type: string
 *                   example: "Detailed error message"
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
 *     description: Allows an authenticated user to delete a specific trip by its ID. Also removes the trip from the favorites list of any users who have it marked as a favorite.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to delete
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Trip deleted successfully"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error occurred while deleting the trip"
 */
router.delete(
  "/:id",
  authMiddleware,
  TripController.deleteTrip.bind(TripController)
);

/**
 * @swagger
 * /trips/{tripId}/{commentId}:
 *   delete:
 *     summary: Delete a comment from a trip
 *     description: Allows an authenticated user to delete a specific comment from a trip. Updates the number of comments for the trip accordingly.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip containing the comment
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174002"
 *         description: The ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174003"
 *                   owner:
 *                     type: string
 *                     example: "Jane Doe"
 *                   comment:
 *                     type: string
 *                     example: "This was an amazing trip!"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2024-11-24"
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error in deleteComment"
 */
router.delete(
  "/:tripId/:commentId",
  authMiddleware,
  TripController.deleteComment.bind(TripController)
);

export default router;
