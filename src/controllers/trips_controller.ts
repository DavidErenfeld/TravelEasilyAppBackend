import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { ParsedQs } from "qs";
import { BaseController } from "./base_controller";
import { AuthRequest } from "../common/auth_middleware";
import { ITrips, Trip } from "../entity/trips_model";
import { User } from "../entity/users_model";
import { io } from "../services/socket";
import { In } from "typeorm";
import connectDB from "../data-source";

class TripController extends BaseController<ITrips> {
  constructor(entity: EntityTarget<ITrips>) {
    super(entity);
  }

  // הוספת טיול חדש
  async post(req: AuthRequest, res: Response): Promise<void> {
    req.body.owner = req.user._id;
    try {
      await super.post(req, res);
    } catch (err) {
      console.error("Error in posting trip:", err);
      res.status(500).send("Error occurred while processing the request");
    }
  }

  // קבלת טיולים לפי ID של בעל הטיול
  async getByOwnerId(req: Request, res: Response) {
    try {
      const ownerId = req.params.id;
      const trips = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where("owner._id = :ownerId", { ownerId })
        .getMany();
      res.status(trips.length > 0 ? 200 : 404).json(trips);
    } catch (err) {
      console.error("Error fetching trips by owner ID:", err);
      res.status(500).json({ message: err.message });
    }
  }

  // קבלת טיולים לפי פרמטרים דינאמיים
  async getByParamId(req: Request, res: Response) {
    try {
      const queryParams: ParsedQs = req.query;
      const whereCondition: Record<string, string | number | boolean> = {};
      let numOfDaysCondition: number | null = null;

      Object.entries(queryParams).forEach(([key, value]) => {
        if (key === "numOfDays" && typeof value === "string") {
          numOfDaysCondition = parseInt(value, 10);
        } else if (typeof value === "string") {
          whereCondition[key] = value;
        }
      });

      const query = this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where(whereCondition);

      if (numOfDaysCondition !== null) {
        query.andWhere(
          'json_array_length(trip."tripDescription") = :numOfDays',
          { numOfDays: numOfDaysCondition }
        );
      }

      const trips = await query.getMany();
      res.status(trips.length > 0 ? 200 : 404).json({ data: trips });
    } catch (err) {
      console.error("Error fetching trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // קבלת טיולים מועדפים לפי מזהה משתמש
  async getFavoriteTrips(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (!user?.favoriteTrips?.length) return res.status(200).json([]);

      const trips = await this.entity.find({
        where: { _id: In(user.favoriteTrips) },
        relations: ["owner", "likes", "comments"],
      });
      res.status(200).json(trips);
    } catch (err) {
      console.error("Error fetching favorite trips:", err);
      res.status(500).json({ message: err.message });
    }
  }

  // מחיקת טיול
  async deleteTrip(req: Request, res: Response) {
    try {
      const tripId = req.params.id;
      const tripToDelete = await this.entity.findOne({
        where: { _id: tripId },
      });
      if (!tripToDelete) return res.status(404).send("Trip not found");

      const userRepository = connectDB.getRepository(User);
      const usersWithFavoriteTrip = await userRepository
        .createQueryBuilder("user")
        .where(":tripId = ANY(user.favoriteTrips)", { tripId })
        .getMany();

      for (const user of usersWithFavoriteTrip) {
        user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
        await userRepository.save(user);
      }

      const deleteResult = await this.entity.delete(tripId);
      if (deleteResult.affected === 0)
        return res.status(500).send("Failed to delete trip");

      res.send("Trip deleted successfully");
    } catch (err) {
      console.error("Error deleting trip:", err);
      res.status(500).send("Error occurred while deleting the trip");
    }
  }

  // הוספת תגובה
  async addComment(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments"],
      });
      if (!trip) return res.status(404).send("Trip not found");

      const newComment = { ownerId: req.user._id, ...req.body.comment };
      trip.comments.push(newComment);
      await this.entity.save(trip);

      io.emit("commentAdded", { tripId, newComment });
      res.status(200).send(trip.comments);
    } catch (error) {
      console.error("Error in addComment:", error.message);
      res.status(500).send(error.message);
    }
  }

  // הוספת לייק והסרת לייק
  async addLike(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["likes"],
      });
      if (!trip) return res.status(404).send("Trip not found");

      const alreadyLiked = trip.likes.some(
        (like) => like.owner === req.user._id
      );
      if (!alreadyLiked) {
        trip.likes.push({ owner: req.user._id });
        await this.entity.save(trip);
        io.emit("likeAdded", { tripId, userId: req.user._id });
        return res.status(200).send(trip);
      }

      trip.likes = trip.likes.filter((like) => like.owner !== req.user._id);
      await this.entity.save(trip);
      io.emit("likeRemoved", { tripId, userId: req.user._id });
      res.status(200).send(trip);
    } catch (error) {
      console.error("Error in addLike:", error.message);
      res.status(500).send(error.message);
    }
  }

  // קבלת טיול עם תגובות
  async getWithComments(req: Request, res: Response) {
    try {
      const tripId = req.params.id;
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments", "likes", "owner"],
      });
      res.status(trip ? 200 : 404).json(trip);
    } catch (err) {
      console.error("Error fetching trip with comments:", err);
      res.status(500).json({ message: err.message });
    }
  }

  // מחיקת תגובה
  async deleteComment(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const commentId = req.params.commentId;

      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments"],
      });
      if (!trip) return res.status(404).send("Trip not found");

      trip.comments = trip.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );
      trip.numOfComments = trip.comments.length;
      await this.entity.save(trip);

      io.emit("commentDeleted", { tripId, commentId });
      res.status(200).send(trip.comments);
    } catch (error) {
      console.error("Error in deleteComment:", error.message);
      res.status(500).send(error.message);
    }
  }
}

export default new TripController(Trip);
