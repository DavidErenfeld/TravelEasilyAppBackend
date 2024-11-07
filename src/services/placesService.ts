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

const CACHE_EXPIRATION = 3600; // זמן חיי המטמון בשניות (שעה)

export async function fetchPlaces(
  location: string,
  radius: number,
  type: string
): Promise<Place[]> {
  const cacheKey = `places:${location}:${radius}:${type}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Returning cached result");
    return JSON.parse(cachedData); // החזרת כל התוצאות שנשמרו במטמון, ללא חיתוך
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

    // הדפסת כל התגובה שהתקבלה מה-API כדי לראות מה חזר בדיוק
    console.log("API Response:", response.data);

    const places = response.data.results.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      phone: place.formatted_phone_number || "Not available",
      website: place.website || "Not available",
    }));

    // שמירת כל התוצאות במטמון Redis
    await redisClient.set(cacheKey, JSON.stringify(places), {
      EX: CACHE_EXPIRATION,
    });

    return places; // החזרת כל התוצאות ללקוח, ללא חיתוך
  } catch (error) {
    console.error("Error fetching places:", error);
    throw new Error("Unable to retrieve place information at the moment.");
  }
}
