import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/users_model";
import { Trip } from "./entity/trips_model";
import { Like } from "./entity/like_model";
import { Comment } from "./entity/comment_model";

const connectDB = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  logging: false,
  synchronize: true,
  entities: [User, Trip, Like, Comment],
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

export default connectDB;
