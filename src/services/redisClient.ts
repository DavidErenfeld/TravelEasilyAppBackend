import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient>; // ייצוא הלקוח לשימוש מחוץ לפונקציה

async function initializeRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDISCLOUD_URL, // שימוש ב-REDISCLOUD_URL שהוגדר בהרוקו
    });

    redisClient.on("error", (err) => console.log("Redis Client Error", err));

    await redisClient.connect(); // ודא שההתחברות מתבצעת לפני השימוש ב-client

    console.log("Connected to Redis");
  } catch (error) {
    console.error("Error initializing Redis:", error);
    throw error;
  }
}

// אתחול Redis רק פעם אחת במבנה זה
initializeRedis().catch((error) => {
  console.error("Failed to initialize Redis:", error);
});

export default redisClient; // ייצוא הלקוח לשימוש מחוץ לפונקציה
