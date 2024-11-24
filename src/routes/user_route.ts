import express from "express";
const router = express.Router();
import authMiddleware from "../common/auth_middleware";
import UserController from "../controllers/user_controller";

/**
 * @swagger
 * /users/{userId}/favorites:
 *   get:
 *     summary: Get favorite trip IDs for a user
 *     description: Retrieves a list of trip IDs marked as favorites by the specified user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description: The ID of the user whose favorite trips are being fetched.
 *     responses:
 *       200:
 *         description: List of favorite trip IDs for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error.
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
router.get(
  "/:userId/favorites",
  authMiddleware,
  UserController.getFavoriteTripIds.bind(UserController)
);
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user's details
 *     description: Updates a user's details by their ID. If the password is provided, it will be encrypted before saving.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description: The ID of the user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: "John Doe"
 *                 description: The updated username of the user.
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *                 description: The updated email of the user.
 *               password:
 *                 type: string
 *                 example: "newpassword123"
 *                 description: The updated password, which will be encrypted before saving.
 *               imgUrl:
 *                 type: string
 *                 example: "https://example.com/profile.jpg"
 *                 description: URL to the updated profile image of the user.
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     userName:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     imgUrl:
 *                       type: string
 *                       example: "https://example.com/profile.jpg"
 *       401:
 *         description: Unauthorized - user not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error.
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

router.put("/:id", authMiddleware, UserController.put.bind(UserController));

/**
 * @swagger
 * /users/favorites/{tripId}:
 *   post:
 *     summary: Add a trip to the user's favorites
 *     description: Allows an authenticated user to add a specific trip to their list of favorite trips.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to add to favorites.
 *     responses:
 *       200:
 *         description: Trip added to favorites successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip added to favorites"
 *                 favoriteTrips:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["123e4567-e89b-12d3-a456-426614174001", "123e4567-e89b-12d3-a456-426614174002"]
 *       401:
 *         description: Unauthorized - user not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       409:
 *         description: Trip is already in the user's favorites.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip is already in favorites"
 *       500:
 *         description: Internal server error.
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
router.post(
  "/favorites/:tripId",
  authMiddleware,
  UserController.addFavoriteTrip.bind(UserController)
);

/**
 * @swagger
 * /users/request-password-reset:
 *   post:
 *     summary: Request password reset
 *     description: Allows a user to request a password reset. An email will be sent with a reset link that expires after 1 hour.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *                 description: The email address of the user requesting a password reset.
 *     responses:
 *       200:
 *         description: Password reset email sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset email sent"
 *       404:
 *         description: User not found for the provided email address.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error occurred while processing the request.
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
router.post(
  "/request-password-reset",
  UserController.requestPasswordReset.bind(UserController)
);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Allows a user to reset their password using a valid token received via email. The token expires after 1 hour.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: The token provided in the password reset email.
 *               newPassword:
 *                 type: string
 *                 example: "newSecurePassword123"
 *                 description: The new password to set for the user account.
 *     responses:
 *       200:
 *         description: Password has been reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password has been reset successfully"
 *       400:
 *         description: Token has expired.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token has expired"
 *       404:
 *         description: User not found for the provided token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error occurred while processing the request.
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
router.post(
  "/reset-password",
  UserController.resetPassword.bind(UserController)
);

/**
 * @swagger
 * /users/favorites/{tripId}:
 *   delete:
 *     summary: Remove a trip from user's favorites
 *     description: Allows an authenticated user to remove a specific trip from their list of favorite trips.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         description: The ID of the trip to remove from favorites.
 *     responses:
 *       200:
 *         description: The trip has been successfully removed from favorites.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trip removed from favorites"
 *                 favoriteTrips:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["123e4567-e89b-12d3-a456-426614174002", "123e4567-e89b-12d3-a456-426614174003"]
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error occurred while processing the request.
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
router.delete(
  "/favorites/:tripId",
  authMiddleware,
  UserController.removeFavoriteTrip.bind(UserController)
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user and related data
 *     description: Deletes a user by their ID along with all related data such as comments, likes, and trips. Updates the related trip's comment and like counts accordingly.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description: The ID of the user to delete.
 *     responses:
 *       200:
 *         description: User and related data deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error occurred while deleting the user and related data.
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
router.delete(
  "/:id",
  authMiddleware,
  UserController.deleteUser.bind(UserController)
);

export default router;
