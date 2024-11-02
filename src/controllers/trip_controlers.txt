import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { ParsedQs } from "qs";
import { BaseController } from "./base_controller";
import { AuthRequest } from "../common/auth_middleware";
import { ITrips, Trip } from "../entity/trips_model";
import { io } from "../services/socket";

class TripController extends BaseController<ITrips> {
  constructor(entity: EntityTarget<ITrips>) {
    super(entity);
  }

  async post(req: AuthRequest, res: Response): Promise<void> {
    req.body.owner = req.user._id;
    try {
      await super.post(req, res);
    } catch (err) {
      res.status(500).send("Error occurred while processing the request");
    }
  }

  async getByOwnerId(req: Request, res: Response) {
    console.log(`get by id: ${req.params.id}`);
    try {
      const ownerId = req.params.id;
      const trips = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where("owner._id = :ownerId", { ownerId })
        .getMany();
      res.status(trips.length > 0 ? 200 : 201).send(trips);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  async getByParamId(req: Request, res: Response) {
    const allowedFields = [
      "_id",
      "owner",
      "userName",
      "imgUrl",
      "typeTraveler",
      "country",
      "typeTrip",
      "numOfDays",
      "numOfComments",
      "numOfLikes",
    ];
    console.log("get by params:", req.query);
    try {
      const queryParams: ParsedQs = req.query;
      const whereCondition: Record<string, string | number | boolean> = {};

      Object.entries(queryParams).forEach(([key, value]) => {
        if (allowedFields.includes(key) && typeof value === "string") {
          whereCondition[key] = value;
        }
      });

      if (Object.keys(whereCondition).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid query parameters provided" });
      }

      const trips = await this.entity.find({
        where: whereCondition,
        relations: ["owner", "comments", "likes"],
      });

      res.status(trips.length > 0 ? 200 : 404).json({ data: trips });
    } catch (err) {
      console.error("Error fetching trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getWithComments(req: Request, res: Response) {
    console.log(`get by id: ${req.params.id}`);
    try {
      const tripId = req.params.id;
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments", "likes", "owner"],
      });
      res.status(trip ? 200 : 201).send(trip);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  async addComment(req: AuthRequest, res: Response) {
    console.log("addComment");
    try {
      const tripId = req.params.tripId;
      const owner_id = req.user._id;

      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments", "likes"],
      });
      if (!trip) {
        return res.status(404).send("Trip not found");
      }

      // יצירת אובייקט תגובה חדש
      const newComment = {
        ownerId: owner_id,
        owner: req.body.owner || req.user.userName,
        comment: req.body.comment,
        date: req.body.date,
      };

      trip.comments.push(newComment);
      trip.numOfComments = trip.comments.length;
      await this.entity.save(trip);

      // בדיקה אם io מוגדר לפני הקריאה ל-emit
      if (io) {
        io.emit("commentAdded", { tripId, newComment });
      }

      res.status(200).send(trip.comments);
    } catch (error) {
      console.error("Error in addComment:", error.message);
      res.status(500).send(error.message);
    }
  }

  async deleteComment(req: AuthRequest, res: Response) {
    console.log("DeleteComment");
    try {
      const tripId = req.params.tripId;
      const commentId = req.params.commentId;

      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments"],
      });
      if (!trip) {
        return res.status(404).send("Trip not found");
      }

      // סינון התגובות כך ש-commentId שנמחק לא יישאר במערך
      trip.comments = trip.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );
      trip.numOfComments = trip.comments.length;
      await this.entity.save(trip);

      // בדיקה אם io מוגדר לפני הקריאה ל-emit
      if (io) {
        io.emit("commentDeleted", { tripId, commentId });
      }

      res.status(200).send(trip.comments);
    } catch (error) {
      console.error("Error in deleteComment:", error.message);
      res.status(500).send(error.message);
    }
  }

  async addLike(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const userId = req.user._id;
      req.body.owner = userId;

      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["likes"],
      });
      if (!trip) {
        return res.status(404).send("Trip not found");
      }

      // בדיקה אם המשתמש כבר עשה לייק
      if (!trip.likes.some((like) => like.owner === userId)) {
        // הוספת לייק אם המשתמש לא עשה לייק קודם
        trip.likes.push({ owner: userId });
        trip.numOfLikes++;
        await this.entity.save(trip);

        // בדיקה אם io מוגדר לפני הקריאה ל emit
        if (io) {
          io.emit("likeAdded", { tripId, userId });
        }
        return res.status(200).send(trip);
      }

      // הסרת לייק אם המשתמש כבר עשה לייק
      trip.likes = trip.likes.filter((user) => user.owner !== userId);
      trip.numOfLikes--;
      await this.entity.save(trip);

      // בדיקה אם io מוגדר לפני הקריאה ל emit
      if (io) {
        io.emit("likeRemoved", { tripId, userId });
      }
      res.status(200).send(trip);
    } catch (error) {
      console.error("Error in addLike:", error.message);
      res.status(500).send(error.message);
    }
  }
}

export default new TripController(Trip);
