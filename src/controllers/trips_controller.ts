import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { ParsedQs } from "qs";
import { BaseController } from "./base_controller";
import { AuthRequest } from "../common/auth_middleware";
import { ITrips, Trip } from "../entity/trips_model";
import { User } from "../entity/users_model";
import { io } from "../services/socket";
import connectDB from "../data-source";

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
      "numOfComments",
      "numOfLikes",
      "numOfDays",
    ];
    console.log("get by params:", req.query);

    try {
      const queryParams: ParsedQs = req.query;
      const whereCondition: Record<string, string | number | boolean> = {};
      let numOfDaysCondition: number | null = null;

      Object.entries(queryParams).forEach(([key, value]) => {
        if (allowedFields.includes(key) && typeof value === "string") {
          if (key === "numOfDays") {
            numOfDaysCondition = parseInt(value, 10);
          } else {
            whereCondition[key] = value;
          }
        }
      });

      if (
        Object.keys(whereCondition).length === 0 &&
        numOfDaysCondition === null
      ) {
        return res
          .status(400)
          .json({ message: "No valid query parameters provided" });
      }

      const query = this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where(whereCondition);

      if (numOfDaysCondition !== null) {
        query.andWhere(
          'json_array_length(trip."tripDescription") = :numOfDays',
          {
            numOfDays: numOfDaysCondition,
          }
        );
      }

      const trips = await query.getMany();
      res.status(trips.length > 0 ? 200 : 404).json({ data: trips });
    } catch (err) {
      console.error("Error fetching trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getFavoriteTrips(req: AuthRequest, res: Response) {
    console.log(`Fetching favorite trips for user: ${req.user._id}`);
    try {
      const userId = req.user._id;
      const userRepository = connectDB.getRepository(User);

      const user = await userRepository.findOne({ where: { _id: userId } });
      if (!user) {
        console.log(`User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.favoriteTrips || user.favoriteTrips.length === 0) {
        console.log(`No favorite trips for user: ${userId}`);
        return res.status(200).json([]);
      }

      console.log(`User ${userId} has favorite trips:`, user.favoriteTrips);

      const trips = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where("trip._id IN (:...favoriteTrips)", {
          favoriteTrips: user.favoriteTrips,
        })
        .getMany();

      console.log(`Found ${trips.length} favorite trips for user: ${userId}`);
      res.status(200).json(trips);
    } catch (err) {
      console.error("Error fetching favorite trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async deleteTrip(req: Request, res: Response) {
    const tripId = req.params.id;
    console.log(`Attempting to delete trip with ID: ${tripId}`);

    try {
      const tripToDelete = await this.entity.findOne({
        where: { _id: tripId },
      });
      if (!tripToDelete) {
        console.log(`Trip with ID ${tripId} not found`);
        return res.status(404).send("Trip not found");
      }

      // עדכון משתמשים שמחזיקים את הטיול הזה במועדפים
      const userRepository = connectDB.getRepository(User);
      const usersWithFavoriteTrip = await userRepository
        .createQueryBuilder("user")
        .where(":tripId = ANY(user.favoriteTrips)", { tripId })
        .getMany();

      for (const user of usersWithFavoriteTrip) {
        user.favoriteTrips = user.favoriteTrips.filter(
          (favoriteTripId) => favoriteTripId !== tripId
        );
        await userRepository.save(user);
        console.log(`Removed trip ${tripId} from user ${user._id}'s favorites`);
      }

      // מחיקת הטיול עצמו
      const deleteResult = await this.entity.delete(tripId);
      if (deleteResult.affected === 0) {
        console.log(`Failed to delete trip with ID: ${tripId}`);
        return res
          .status(504)
          .send("No rows deleted, request timed out or object not found");
      }

      console.log(`Successfully deleted trip with ID: ${tripId}`);
      res.send("Trip deleted successfully");
    } catch (err) {
      console.error("Error deleting trip:", err);
      res.status(500).send("Error occurred while deleting the trip");
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

      const newComment = {
        ownerId: owner_id,
        owner: req.body.comment.owner,
        comment: req.body.comment.comment,
        date: req.body.comment.date,
      };

      trip.comments.push(newComment);
      trip.numOfComments = trip.comments.length;
      await this.entity.save(trip);

      io.emit("commentAdded", { tripId, newComment });
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

      if (!trip.likes.some((like) => like.owner === userId)) {
        trip.likes.push({ owner: userId });
        trip.numOfLikes++;
        await this.entity.save(trip);
        io.emit("likeAdded", { tripId, userId });
        return res.status(200).send(trip);
      }
      trip.likes = trip.likes.filter((user) => user.owner !== userId);
      trip.numOfLikes--;
      await this.entity.save(trip);
      io.emit("likeRemoved", { tripId, userId });
      res.status(200).send(trip);
    } catch (error) {
      console.error("Error in addLike:", error.message);
      res.status(500).send(error.message);
    }
  }
}

export default new TripController(Trip);
