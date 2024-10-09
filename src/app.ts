import express, { Express } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config()
const app = express();
import tripsRoute from "./routes/trips_route";
import authRoute from "./routes/auth_route";
import fileRoute from "./routes/file_route";
import userRoute from "./routes/user_route";
//import CommentsRoute from "./routes/comments_route";
import connectDB from "./data-source";
const InitApp = () => {

  return new Promise<Express>((reslove, reject) => {
    connectDB
    .initialize()
    .then(async () => {
      console.log("Data Source has been initialized`", connectDB.isInitialized)
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use((req, res, next) => {
          next();
        });
        app.use(cors());
        app.use("/public", express.static("public"));        
        app.use("/trips", tripsRoute);
        app.use("/auth", authRoute);
        app.use("/file", fileRoute);
        app.use("/users", userRoute);
//        app.use("/comments", CommentsRoute);


        reslove(app);
    })
    .catch((err) => {
        console.error(`Data Source initialization error`, err);
        reject(err);

    })

       
  });
};
export  = InitApp;
