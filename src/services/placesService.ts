import axios from "axios";
import redisClient from "./redisClient";
import { Place } from "../types/placesTypes";

const CACHE_EXPIRATION = 3600;

export async function fetchPlaces(
  location: string,
  radius: number,
  type: string
): Promise<Place[]> {
  const cacheKey = `places:${location}:${radius}:${type}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Returning cached result from Redis");
    return JSON.parse(cachedData);
  }

  console.log("Fetching data from Google Places API");

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius,
          type,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );
    const places = await Promise.all(
      response.data.results.slice(0, 10).map(async (place: any) => {
        const detailsResponse = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: place.place_id,
              fields: "formatted_phone_number,website",
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
          }
        );

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          phone:
            detailsResponse.data.result.formatted_phone_number ||
            "Not available",
          website: detailsResponse.data.result.website || "Not available",
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          types: place.types,
          business_status: place.business_status,
        };
      })
    );

    await redisClient.set(cacheKey, JSON.stringify(places), {
      EX: CACHE_EXPIRATION,
    });

    return places;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Axios error while fetching places:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error while fetching places:", error);
    }
    throw new Error("Unable to retrieve place information at the moment.");
  }
}
