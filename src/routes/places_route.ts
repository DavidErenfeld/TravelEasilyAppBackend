import { Router } from "express";
import { getPlaces } from "../controllers/placesController";

const router = Router();

/**
 * @swagger
 * /places:
 *   get:
 *     summary: Retrieve nearby places
 *     description: Returns a list of places near a specific location based on radius and type.
 *     tags:
 *       - Places
 *     parameters:
 *       - in: query
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: "Coordinates of the location in the format 'latitude,longitude'."
 *       - in: query
 *         name: radius
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Search radius in meters (e.g., 1000 for 1km)."
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: "Type of place to search (e.g., restaurant, cafe, bar)."
 *     responses:
 *       200:
 *         description: A list of places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Place'
 *       400:
 *         description: Missing required query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get("/", getPlaces);

export default router;
