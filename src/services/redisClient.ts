import Redis from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL, // משתנה סביבה עם הקישור ל-Redis
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

redisClient.connect();

export default redisClient;
