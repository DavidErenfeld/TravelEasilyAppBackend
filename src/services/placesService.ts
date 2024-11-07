import axios from "axios";
import redisClient from "./redisClient";

interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone: string;
  website: string;
}

const CACHE_EXPIRATION = 3600; // Cache lifetime in seconds (e.g., one hour)

export async function fetchPlaces(
  location: string,
  radius: number,
  type: string
): Promise<Place[]> {
  const cacheKey = `places:${location}:${radius}:${type}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Returning cached result");
    return JSON.parse(cachedData);
  }

  console.log("Fetching data from Google Places API");

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius: Math.min(radius, 2000), // Maximum radius limit
          type,
          key: process.env.GOOGLE_PLACES_API_KEY, // Environment variable for API key
        },
      }
    );

    const places = response.data.results.slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      phone: place.formatted_phone_number || "Not available",
      website: place.website || "Not available",
    }));

    await redisClient.set(cacheKey, JSON.stringify(places), {
      EX: CACHE_EXPIRATION,
    });

    return places;
  } catch (error) {
    console.error("Error fetching places:", error);
    throw new Error("Unable to retrieve place information at the moment.");
  }
}
