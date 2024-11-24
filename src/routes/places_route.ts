import { Router } from "express";
import { getPlaces } from "../controllers/placesController";

const router = Router();

router.get("/places", getPlaces);

export default router;
