import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/users_model";
import { Trip } from "./entity/trips_model";
import { Like } from "./entity/like_model";
import { Comment } from "./entity/comment_model";
import { readFileSync } from "fs";

const connectDB = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  logging: false,
  synchronize: true,
  entities: [User, Trip, Like, Comment],
  extra: {
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: true,
            ca: readFileSync(process.env.SSL_CERT_PATH_POSTGRES).toString(),
          }
        : false,
  },
});

export default connectDB;
