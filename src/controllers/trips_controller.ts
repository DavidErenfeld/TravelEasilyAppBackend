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

  // פונקציית עזר להוספת שדות isLikedByCurrentUser ו-isFavoritedByCurrentUser
  private async enrichTripsWithUserData(trips: ITrips[], userId: string) {
    const userRepository = connectDB.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: userId } });

    const favoriteTrips = user?.favoriteTrips || [];

    return trips.map((trip) => {
      const isLikedByCurrentUser = trip.likes.some(
        (like) => like.owner === userId
      );
      const isFavoritedByCurrentUser = favoriteTrips.includes(trip._id);

      return { ...trip, isLikedByCurrentUser, isFavoritedByCurrentUser };
    });
  }

  async getAllTrips(req: AuthRequest, res: Response) {
    try {
      const trips = await this.entity.find({
        relations: ["owner", "likes", "comments"],
      });

      if (req.user) {
        const userId = req.user._id;
        const tripsWithUserData = await this.enrichTripsWithUserData(
          trips,
          userId
        );
        res.status(200).json(tripsWithUserData);
      } else {
        res.status(200).json(trips);
      }
    } catch (err) {
      console.error("Failed to retrieve data:", err);
      res.status(500).send({ message: "Error retrieving data", error: err });
    }
  }

  async post(req: AuthRequest, res: Response): Promise<void> {
    req.body.owner = req.user._id;
    try {
      await super.post(req, res);
    } catch (err) {
      console.error("Error in posting trip:", err);
      res.status(500).send("Error occurred while processing the request");
    }
  }

  async getByOwnerId(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.params.id;
      const trips = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .leftJoinAndSelect("trip.likes", "likes")
        .leftJoinAndSelect("trip.comments", "comments")
        .where("owner._id = :ownerId", { ownerId })
        .getMany();

      if (req.user) {
        const userId = req.user._id;
        const tripsWithUserData = await this.enrichTripsWithUserData(
          trips,
          userId
        );
        res.status(trips.length > 0 ? 200 : 404).json(tripsWithUserData);
      } else {
        res.status(trips.length > 0 ? 200 : 404).json(trips);
      }
    } catch (err) {
      console.error("Error fetching trips by owner ID:", err);
      res.status(500).json({ message: err.message });
    }
  }

  async getByParamId(req: AuthRequest, res: Response) {
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

      if (req.user) {
        const userId = req.user._id;
        const tripsWithUserData = await this.enrichTripsWithUserData(
          trips,
          userId
        );
        res
          .status(trips.length > 0 ? 200 : 404)
          .json({ data: tripsWithUserData });
      } else {
        res.status(trips.length > 0 ? 200 : 404).json({ data: trips });
      }
    } catch (err) {
      console.error("Error fetching trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getFavoriteTrips(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id || req.params.userId;
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (!user?.favoriteTrips?.length) return res.status(200).json([]);

      const trips = await this.entity.find({
        where: { _id: In(user.favoriteTrips) },
        relations: ["owner", "likes", "comments"],
      });

      if (req.user) {
        const tripsWithUserData = await this.enrichTripsWithUserData(
          trips,
          userId
        );
        res.status(200).json(tripsWithUserData);
      } else {
        res.status(200).json(trips);
      }
    } catch (err) {
      console.error("Error fetching favorite trips:", err);
      res.status(500).json({ message: err.message });
    }
  }

  async deleteTrip(req: AuthRequest, res: Response) {
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
      trip.numOfComments = trip.comments.length;
      await this.entity.save(trip);

      // הוספת השדות isLikedByCurrentUser ו-isFavoritedByCurrentUser
      if (req.user) {
        const enrichedTrip = await this.enrichTripsWithUserData(
          [trip],
          req.user._id
        );
        io.emit("commentAdded", { tripId, newComment });
        res.status(200).send(enrichedTrip[0].comments);
      } else {
        io.emit("commentAdded", { tripId, newComment });
        res.status(200).send(trip.comments);
      }
    } catch (error) {
      console.error("Error in addComment:", error.message);
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
      } else {
        trip.likes = trip.likes.filter((user) => user.owner !== userId);
        trip.numOfLikes--;
        await this.entity.save(trip);
        io.emit("likeRemoved", { tripId, userId });
      }

      // הוספת השדות isLikedByCurrentUser ו-isFavoritedByCurrentUser
      if (req.user) {
        const tripsWithUserData = await this.enrichTripsWithUserData(
          [trip],
          userId
        );
        res.status(200).send(tripsWithUserData[0]);
      } else {
        res.status(200).send(trip);
      }
    } catch (error) {
      console.error("Error in addLike:", error.message);
      res.status(500).send(error.message);
    }
  }

  async getWithComments(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.id;
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["comments", "likes", "owner"],
      });

      if (req.user && trip) {
        const enrichedTrip = await this.enrichTripsWithUserData(
          [trip],
          req.user._id
        );
        res.status(200).json(enrichedTrip[0]);
      } else {
        res.status(trip ? 200 : 404).json(trip);
      }
    } catch (err) {
      console.error("Error fetching trip with comments:", err);
      res.status(500).json({ message: err.message });
    }
  }

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

      // הוספת השדות isLikedByCurrentUser ו-isFavoritedByCurrentUser
      if (req.user) {
        const enrichedTrip = await this.enrichTripsWithUserData(
          [trip],
          req.user._id
        );
        res.status(200).send(enrichedTrip[0].comments);
      } else {
        res.status(200).send(trip.comments);
      }
    } catch (error) {
      console.error("Error in deleteComment:", error.message);
      res.status(500).send(error.message);
    }
  }

  async getLikesWithUserDetails(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;

      const tripWithLikes = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.likes", "like")
        .leftJoinAndMapOne(
          "like.ownerDetails",
          User,
          "user",
          "CAST(user._id AS TEXT) = like.owner"
        )
        .where("trip._id = :tripId", { tripId })
        .getOne();

      if (!tripWithLikes) {
        return res.status(404).send("Trip not found");
      }

      if (!tripWithLikes.likes || tripWithLikes.likes.length === 0) {
        return res.status(200).json({
          message: "No likes found for this trip.",
          totalLikes: 0,
          likesDetails: [],
        });
      }

      const likesDetails = tripWithLikes.likes.map((like) => ({
        userName: (like as any).ownerDetails?.userName || "Unknown User",
        imgUrl: (like as any).ownerDetails?.imgUrl || "",
      }));

      res.status(200).json({
        totalLikes: likesDetails.length,
        likesDetails,
      });
    } catch (error) {
      console.error("Error fetching likes with user details:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new TripController(Trip);
