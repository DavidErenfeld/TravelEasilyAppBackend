import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/users_model";
import { Trip } from "./entity/trips_model";
import { Like } from "./entity/like_model";
import { Comment } from "./entity/comment_model";

const isProduction = process.env.NODE_ENV === "production";

const connectDB = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL, // השתמש תמיד ב-DATABASE_URL בהרוקו
  host: isProduction ? undefined : process.env.DB_HOST,
  port: isProduction ? undefined : Number(process.env.DB_PORT),
  username: isProduction ? undefined : process.env.DB_USER_NAME,
  password: isProduction ? undefined : process.env.DB_PASSWORD,
  database: isProduction ? undefined : process.env.DB_DATABASE,
  logging: false,
  synchronize: true,
  entities: [User, Trip, Like, Comment],
  extra: {
    ssl: isProduction
      ? { rejectUnauthorized: false } // השאר SSL פשוט ב-production
      : false, // השבת SSL בסביבה מקומית
  },
});

export default connectDB;
