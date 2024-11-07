import { Request, Response } from "express";
import { fetchPlacesWithFullDetails } from "../services/placesService";

export const getPlaces = async (req: Request, res: Response) => {
  const { location, radius, type } = req.query;

  console.log("Received request to /getPlaces with params:", {
    location,
    radius,
    type,
  });

  if (!location || !radius || !type) {
    console.error("Missing required parameters");
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

    console.log("Returning places data to client");
    res.json(places);
  } catch (error) {
    console.error("Error in getPlaces:", error);
    res.status(500).json({ error: "Unable to retrieve results at this time." });
  }
};
