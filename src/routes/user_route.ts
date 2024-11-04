import express from "express";
const router = express.Router();
import authMiddleware from "../common/auth_middleware";
import UserController from "../controllers/user_controller";

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Retrieve user details by ID
 *     tags: [Users]
 *     description: Get user details using the user's unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", authMiddleware, UserController.get.bind(UserController));

/**
 * @swagger
 * /users/{userId}/favorites:
 *   get:
 *     summary: Retrieve list of user's favorite trips by user ID
 *     tags: [Users]
 *     description: Get an array of trip IDs that are in the user's favorites list.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The ID of the user to retrieve favorite trips for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of favorite trip IDs retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:userId/favorites",
  authMiddleware,
  UserController.getFavoriteTripIds.bind(UserController)
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     description: Update user information, including encrypted password if a new one is provided.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id", authMiddleware, UserController.put.bind(UserController));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     description: Delete a user based on the provided ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/:id",
  authMiddleware,
  UserController.delete.bind(UserController)
);

/**
 * @swagger
 * /users/favorites/{tripId}:
 *   post:
 *     summary: Add a trip to user's favorites
 *     tags: [Users]
 *     description: Add a trip to the user's list of favorite trips.
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: The ID of the trip to add to favorites.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip added to favorites successfully
 *       404:
 *         description: User not found
 *       409:
 *         description: Trip is already in favorites
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/favorites/:tripId",
  authMiddleware,
  UserController.addFavoriteTrip.bind(UserController)
);

/**
 * @swagger
 * /users/favorites/{tripId}:
 *   delete:
 *     summary: Remove a trip from user's favorites
 *     tags: [Users]
 *     description: Remove a trip from the user's list of favorite trips.
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         description: The ID of the trip to remove from favorites.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip removed from favorites successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/favorites/:tripId",
  authMiddleware,
  UserController.removeFavoriteTrip.bind(UserController)
);

export default router;
