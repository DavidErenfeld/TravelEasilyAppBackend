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
import { Like } from "../entity/like_model";

class TripController extends BaseController<ITrips> {
  constructor(entity: EntityTarget<ITrips>) {
    super(entity);
  }

  private async enrichTripsWithUserData(trips: ITrips[], userId: string) {
    const userRepository = connectDB.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: userId } });

    const favoriteTrips = user?.favoriteTrips || [];

    return trips.map((trip) => {
      const isLikedByCurrentUser = trip.likes
        ? trip.likes.some((like) => like.user?._id === userId)
        : false;

      const isFavoritedByCurrentUser = favoriteTrips.includes(trip._id || "");

      return { ...trip, isLikedByCurrentUser, isFavoritedByCurrentUser };
    });
  }

  async getAllTrips(req: AuthRequest, res: Response) {
    try {
      const trips = await this.entity.find({
        relations: ["owner"],
      });

      const filteredTrips = trips.map(({ comments, likes, ...trip }) => ({
        ...trip,
        owner: trip.owner
          ? {
              userName: trip.owner.userName,
              imgUrl: trip.owner.imgUrl,
            }
          : null,
      }));

      if (req.user) {
        const userId = req.user._id;
        const tripsWithUserData = await this.enrichTripsWithUserData(
          filteredTrips as ITrips[],
          userId
        );
        return res.status(200).json(tripsWithUserData);
      }

      res.status(200).json(filteredTrips);
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

  async updateTrip(req: AuthRequest, res: Response) {
    console.log("Updating trip:", req.params.id);
    try {
      // טעינת הטיול עם קשרים
      const trip = await this.entity
        .createQueryBuilder("trip")
        .leftJoinAndSelect("trip.owner", "owner")
        .where("trip._id = :id", { id: req.params.id })
        .getOne();

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // בדיקה אם המשתמש הוא הבעלים של הטיול
      if (trip.owner._id !== req.user?._id) {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this trip" });
      }

      // שדות מותרים לעדכון
      const allowedUpdates: Partial<ITrips> = {
        typeTraveler: req.body.typeTraveler,
        country: req.body.country,
        typeTrip: req.body.typeTrip,
        tripDescription: req.body.tripDescription,
        tripPhotos: req.body.tripPhotos, // שימוש בערך הנכון
      };

      // עדכון השדות המותרים
      Object.assign(trip, allowedUpdates);

      const updatedTrip = await this.entity.save(trip);

      // שליחת תגובה עם נתונים רלוונטיים
      res.status(200).send({
        _id: updatedTrip._id,
        typeTraveler: updatedTrip.typeTraveler,
        country: updatedTrip.country,
        typeTrip: updatedTrip.typeTrip,
        tripDescription: updatedTrip.tripDescription,
        tripPhotos: updatedTrip.tripPhotos,
      });
    } catch (err) {
      console.error("Failed to update trip:", err);
      res.status(500).json({ message: "Error updating trip", error: err });
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

      io.emit("commentAdded", { tripId, newComment });
      res.status(200).send(trip.comments);
    } catch (error) {
      console.error("Error in addComment:", error.message);
      res.status(500).send(error.message);
    }
  }

  async addLike(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const userId = req.user._id;

      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["likes", "likes.user"],
      });

      if (!trip) {
        return res.status(404).send("Trip not found");
      }

      const existingLike = trip.likes.find((like) => like.user?._id === userId);

      if (!existingLike) {
        const likeRepository = connectDB.getRepository(Like);
        const newLike = likeRepository.create({
          owner: userId,
          user: { _id: userId },
          trip: { _id: tripId },
        });
        await likeRepository.save(newLike);

        trip.numOfLikes++;
        await this.entity.save(trip);

        io.emit("likeAdded", { tripId, userId });
        return res.status(200).send(trip);
      }

      const likeRepository = connectDB.getRepository(Like);
      await likeRepository.delete(existingLike._id);

      trip.numOfLikes--;
      await this.entity.save(trip);

      io.emit("likeRemoved", { tripId, userId });
      res.status(200).send(trip);
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
      res.status(200).send(trip.comments);
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
