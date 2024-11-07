import axios from "axios";
import redisClient from "./redisClient";

const CACHE_EXPIRATION = 3600; // זמן חיי המטמון בשניות (שעה)

// פונקציה ראשית לשליפת כל פרטי המקומות
export async function fetchPlacesWithFullDetails(
  location: string,
  radius: number,
  type: string
): Promise<any> {
  const cacheKey = `places_full:${location}:${radius}:${type}`;
  console.log("Starting fetchPlacesWithFullDetails with params:", {
    location,
    radius,
    type,
  });
  console.log("Generated cache key:", cacheKey);

  // בדיקת מטמון
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    console.log("Cache hit - returning cached data for key:", cacheKey);
    return JSON.parse(cachedData);
  }

  console.log("Cache miss - fetching data from Google Places API");

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius: Math.min(radius, 20),
          type,
          key: process.env.GOOGLE_PLACES_API_KEY,
        },
      }
    );

    // הדפסת כל התגובה מה-API כדי לראות מה חזר בדיוק
    console.log(
      "Received API response:",
      JSON.stringify(response.data, null, 2)
    );

    // שמירת כל התוצאות במטמון Redis כפי שהן
    await redisClient.set(cacheKey, JSON.stringify(response.data), {
      EX: CACHE_EXPIRATION,
    });
    console.log("Data cached successfully with key:", cacheKey);

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Config:", error.config);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }
    } else {
      console.error("Unexpected error:", error);
    }
    throw new Error("Unable to retrieve place information at the moment.");
  }
}
