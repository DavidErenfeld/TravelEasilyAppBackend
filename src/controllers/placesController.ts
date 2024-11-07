// placesController.ts
import { Request, Response } from "express";
import { fetchPlacesWithFullDetails } from "../services/placesService";

export const getPlaces = async (req: Request, res: Response) => {
  const { location, radius, type } = req.query;

  if (!location || !radius || !type) {
    return res
      .status(400)
      .json({ error: "Location, radius, and type are required." });
  }

  try {
    const places = await fetchPlacesWithFullDetails(
      location as string,
      Number(radius),
      type as string
    );

    res.json(places); // החזרת כל המידע ללקוח
  } catch (error) {
    res.status(500).json({ error: "Unable to retrieve results at this time." });
  }
};
