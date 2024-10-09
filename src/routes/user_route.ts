import express from "express";
const router = express.Router();
import authMiddleware from "../common/auth_middleware";
import UserController from "../controllers/user_controller";
/**
 * @swagger
 * /auth/update/{id}:
 *   patch:
 *     summary: updates a user
 *     tags: [Auth]
 *     description: Updates user information based on the provided ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to update
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put("/:id", authMiddleware, UserController.put.bind(UserController));

/**
 * @swagger
 * /auth/{id}:
 *   get:
 *     summary: retrieves a user via id
 *     tags: [Auth]
 *     description: get user id and retrieves its info
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get("/:id", authMiddleware, UserController.get.bind(UserController));

router.delete(
  "/:id",
  authMiddleware,
  UserController.delete.bind(UserController)
);

export default router;
