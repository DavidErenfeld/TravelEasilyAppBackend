// placesService.ts
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
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Returning cached result");
    return JSON.parse(cachedData); // החזרת כל התוצאות שנשמרו במטמון
  }

  console.log("Fetching data from Google Places API");

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius: Math.min(radius, 2000), // מגבלת רדיוס מקסימלית
          type,
          key: process.env.GOOGLE_PLACES_API_KEY, // מפתח API כמשתנה סביבה
        },
      }
    );

    // הדפסת כל התגובה מה-API כדי לראות מה חזר בדיוק
    console.log("Nearby Search Full API Response:", response.data);

    // שמירת כל התוצאות במטמון Redis כפי שהן
    await redisClient.set(cacheKey, JSON.stringify(response.data), {
      EX: CACHE_EXPIRATION,
    });

    return response.data; // החזרת כל התוצאה ללקוח כפי שהתקבלה
  } catch (error) {
    console.error("Error fetching places:", error);
    throw new Error("Unable to retrieve place information at the moment.");
  }
}
