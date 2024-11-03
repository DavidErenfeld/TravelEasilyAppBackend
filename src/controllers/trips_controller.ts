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

  // Create a new trip with the authenticated user as owner
  async post(req: AuthRequest, res: Response): Promise<void> {
    req.body.owner = req.user._id;
    try {
      await super.post(req, res);
    } catch (err) {
      res.status(500).send("Error occurred while processing the request");
    }
  }

  // Retrieve trips by owner ID
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
      res.status(trips.length > 0 ? 200 : 201).send(trips);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  // Retrieve trips by specified parameters, including array length of tripDescription
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

    try {
      const queryParams: ParsedQs = req.query;
      const whereCondition: Record<string, string | number | boolean> = {};
      let numOfDaysCondition: number | null = null;

      // Build query conditions only for allowed fields
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

      // Add condition for length of tripDescription array if specified
      if (numOfDaysCondition !== null) {
        query.andWhere(
          "jsonb_array_length(trip.tripDescription) = :numOfDays",
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

  // Retrieve a specific trip by ID with comments and likes
  async getWithComments(req: Request, res: Response) {
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

  // Add a comment to a specific trip
  async addComment(req: AuthRequest, res: Response) {
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

  // Delete a comment from a specific trip by comment ID
  async deleteComment(req: AuthRequest, res: Response) {
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

  // Add or remove a like on a specific trip by user ID
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
