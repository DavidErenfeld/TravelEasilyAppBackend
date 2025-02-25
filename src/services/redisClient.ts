import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient>;

async function initializeRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDISCLOUD_URL,
    });

    redisClient.on("error", (err) => console.log("Redis Client Error", err));

    await redisClient.connect();

    console.log("Connected to Redis");
  } catch (error) {
    console.error("Error initializing Redis:", error);
    throw error;
  }
}

initializeRedis().catch((error) => {
  console.error("Failed to initialize Redis:", error);
});

export default redisClient;
