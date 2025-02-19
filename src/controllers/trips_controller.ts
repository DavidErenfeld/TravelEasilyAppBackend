import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { ParsedQs } from "qs";
import { BaseController } from "./base_controller";
import { AuthRequest } from "../common/auth_middleware";
import { ITrips, Trip } from "../entity/trips_model";
import { User } from "../entity/users_model";
import { io } from "../services/socket";
import { In } from "typeorm";
import slugify from "slugify";
import { renderSingleTripAsHtml, renderTripsAsHtml } from "../utils/renderHtml";
import { isBotRequest } from "../utils/botDetection";
import connectDB from "../data-source";

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
        ? trip.likes.some((like) => like.owner === userId)
        : false;
      const isFavoritedByCurrentUser = favoriteTrips.includes(trip._id);

      return { ...trip, isLikedByCurrentUser, isFavoritedByCurrentUser };
    });
  }

  async getAllTrips(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const [trips, total] = await this.entity.findAndCount({
        relations: ["owner", "likes", "comments"],
        skip,
        take: limit,
      });

      const userAgent = req.headers["user-agent"] || "";
      const isBot = isBotRequest(userAgent);

      if (isBot) {
        const html = renderTripsAsHtml(trips);
        return res.send(html);
      }

      let favoriteTripsIds: string[] = [];
      const userId = req.user ? req.user._id : null;

      if (userId) {
        const userRepository = connectDB.getRepository(User);
        const currentUser = await userRepository.findOne({
          where: { _id: userId },
          select: ["favoriteTrips"],
        });
        favoriteTripsIds = currentUser?.favoriteTrips || [];
      }

      const sanitizedTrips = trips.map((trip) => {
        const isLikedByCurrentUser = userId
          ? trip.likes.some((like) => like.owner === userId)
          : false;

        const isFavoritedByCurrentUser = userId
          ? favoriteTripsIds.includes(trip._id)
          : false;

        return {
          _id: trip._id,
          slug: trip.slug,
          typeTraveler: trip.typeTraveler,
          country: trip.country,
          typeTrip: trip.typeTrip,
          tripDescription: trip.tripDescription,
          numOfComments: trip.numOfComments,
          numOfLikes: trip.numOfLikes,
          tripPhotos: trip.tripPhotos,
          owner: {
            userName: trip.owner.userName,
            imgUrl: trip.owner.imgUrl,
          },
          comments: trip.comments.map((comment) => ({
            _id: comment._id,
            owner: comment.owner,
            comment: comment.comment,
            date: comment.date,
          })),
          isLikedByCurrentUser,
          isFavoritedByCurrentUser,
        };
      });

      res.status(200).json({
        data: sanitizedTrips,
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error("Failed to retrieve data:", err);
      res.status(500).send({ message: "Error retrieving data", error: err });
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

  async getFullTrip(req: AuthRequest, res: Response) {
    try {
      const userAgent = req.headers["user-agent"] || "";
      const isBot = isBotRequest(userAgent);
      const slug = req.params.slug;

      const trip = await this.entity.findOne({
        where: { slug },
        relations: ["comments", "likes", "owner"],
      });

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (isBot) {
        const html = renderSingleTripAsHtml(trip);
        return res.send(html);
      }

      const userId = req.user ? req.user._id : null;

      const isLikedByCurrentUser = userId
        ? trip.likes.some((like) => like.owner === userId)
        : false;

      const favoriteTripsIds: string[] = userId
        ? (
            await connectDB.getRepository(User).findOne({
              where: { _id: userId },
              select: ["favoriteTrips"],
            })
          )?.favoriteTrips || []
        : [];

      const isFavoritedByCurrentUser = userId
        ? favoriteTripsIds.includes(trip._id)
        : false;

      const ownerData = {
        userName: trip.owner.userName,
        imgUrl: trip.owner.imgUrl,
        ...(userId === trip.owner._id && { _id: trip.owner._id }),
      };

      const sanitizedTrip = {
        _id: trip._id,
        slug: trip.slug,
        typeTraveler: trip.typeTraveler,
        country: trip.country,
        typeTrip: trip.typeTrip,
        tripDescription: trip.tripDescription,
        numOfComments: trip.numOfComments,
        numOfLikes: trip.numOfLikes,
        tripPhotos: trip.tripPhotos,
        owner: ownerData,
        comments: trip.comments.map((comment) => ({
          _id: comment._id,
          owner: comment.owner,
          comment: comment.comment,
          date: comment.date,
        })),
        isLikedByCurrentUser,
        isFavoritedByCurrentUser,
      };

      res.status(200).json(sanitizedTrip);
    } catch (err) {
      console.error("Error fetching trip with slug:", err);
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

      const userId = req.user ? req.user._id : null;
      const favoriteTripsIds: string[] = userId
        ? (
            await connectDB.getRepository(User).findOne({
              where: { _id: userId },
              select: ["favoriteTrips"],
            })
          )?.favoriteTrips || []
        : [];

      const sanitizedTrips = trips.map((trip) => {
        const isLikedByCurrentUser = userId
          ? trip.likes.some((like) => like.owner === userId)
          : false;

        const isFavoritedByCurrentUser = userId
          ? favoriteTripsIds.includes(trip._id)
          : false;

        const ownerData = {
          userName: trip.owner.userName,
          imgUrl: trip.owner.imgUrl,
          ...(userId === trip.owner._id && { _id: trip.owner._id }),
        };

        return {
          _id: trip._id,
          slug: trip.slug,
          typeTraveler: trip.typeTraveler,
          country: trip.country,
          typeTrip: trip.typeTrip,
          tripDescription: trip.tripDescription,
          numOfComments: trip.numOfComments,
          numOfLikes: trip.numOfLikes,
          tripPhotos: trip.tripPhotos,
          owner: ownerData,
          comments: trip.comments.map((comment) => ({
            _id: comment._id,
            owner: comment.owner,
            comment: comment.comment,
            date: comment.date,
          })),
          isLikedByCurrentUser,
          isFavoritedByCurrentUser,
        };
      });

      res.status(200).json({ data: sanitizedTrips });
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

      const sanitizedTrips = trips.map((trip) => ({
        _id: trip._id,
        slug: trip.slug, // ✅ הוספת ה-slug כאן
        typeTraveler: trip.typeTraveler,
        country: trip.country,
        typeTrip: trip.typeTrip,
        tripDescription: trip.tripDescription,
        numOfComments: trip.numOfComments,
        numOfLikes: trip.numOfLikes,
        tripPhotos: trip.tripPhotos,
        owner: {
          userName: trip.owner.userName,
          imgUrl: trip.owner.imgUrl,
        },
        comments: trip.comments.map((comment) => ({
          _id: comment._id,
          owner: comment.owner,
          comment: comment.comment,
          date: comment.date,
        })),
      }));

      res.status(200).json(sanitizedTrips);
    } catch (err) {
      console.error("Error fetching favorite trips:", err);
      res.status(500).json({ message: err.message });
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

  async addTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: User not authenticated" });
      }

      const userRepository = connectDB.getRepository(User);
      const owner = await userRepository.findOne({ where: { _id: userId } });
      if (!owner) {
        return res.status(404).json({ message: "User not found" });
      }

      let slug = slugify(`${req.body.country}-${req.body.typeTrip}`, {
        lower: true,
      });

      let existingTrip = await this.entity.findOne({ where: { slug } });
      let counter = 1;
      while (existingTrip) {
        slug = slugify(`${req.body.country}-${req.body.typeTrip}-${counter}`, {
          lower: true,
        });
        existingTrip = await this.entity.findOne({ where: { slug } });
        counter++;
      }

      const newTrip: ITrips = {
        owner,
        userName: owner.userName,
        imgUrl: owner.imgUrl || null,
        typeTraveler: req.body.typeTraveler,
        country: req.body.country,
        typeTrip: req.body.typeTrip,
        slug, // ✅ הוספת slug
        tripDescription: req.body.tripDescription,
        tripPhotos: req.body.tripPhotos || [],
        numOfComments: 0,
        numOfLikes: 0,
        comments: [],
        likes: [],
      };

      const createdTrip = await this.entity.save(newTrip);

      res.status(201).json({
        _id: createdTrip._id,
        slug: createdTrip.slug, // ✅ החזרת slug
        typeTraveler: createdTrip.typeTraveler,
        country: createdTrip.country,
        typeTrip: createdTrip.typeTrip,
        tripDescription: createdTrip.tripDescription,
        tripPhotos: createdTrip.tripPhotos,
        numOfComments: createdTrip.numOfComments,
        numOfLikes: createdTrip.numOfLikes,
        owner: {
          userName: createdTrip.userName,
          imgUrl: createdTrip.imgUrl,
        },
      });
    } catch (error) {
      console.error("Error creating trip:", error.message);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
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

  async handleLike(req: AuthRequest, res: Response) {
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

  async updateTrip(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.id; // קבלת ה-id מה-URL
      const trip = await this.entity.findOne({
        where: { _id: tripId },
        relations: ["owner"],
      });

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.owner._id !== req.user?._id) {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this trip" });
      }

      // שמירה על הנתונים הישנים להשוואה
      const oldCountry = trip.country;
      const oldTypeTrip = trip.typeTrip;

      // עדכון הנתונים המותרים בלבד
      const allowedUpdates: Partial<ITrips> = {
        typeTraveler: req.body.typeTraveler,
        country: req.body.country,
        typeTrip: req.body.typeTrip,
        tripDescription: req.body.tripDescription,
        tripPhotos: req.body.tripPhotos,
      };

      Object.assign(trip, allowedUpdates);

      // אם המדינה או סוג הטיול השתנו → עדכון ה-slug
      if (trip.country !== oldCountry || trip.typeTrip !== oldTypeTrip) {
        let slug = slugify(`${trip.country}-${trip.typeTrip}`, { lower: true });
        let existingTrip = await this.entity.findOne({ where: { slug } });
        let counter = 1;

        while (existingTrip && existingTrip._id !== trip._id) {
          slug = slugify(`${trip.country}-${trip.typeTrip}-${counter}`, {
            lower: true,
          });
          existingTrip = await this.entity.findOne({ where: { slug } });
          counter++;
        }

        trip.slug = slug;
      }

      const updatedTrip = await this.entity.save(trip);

      res.status(200).send({
        _id: updatedTrip._id,
        slug: updatedTrip.slug, // ✅ מחזיר slug מעודכן אם השתנה
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
      io.emit("tripDeleted", { tripId });
      res.send("Trip deleted successfully");
    } catch (err) {
      console.error("Error deleting trip:", err);
      res.status(500).send("Error occurred while deleting the trip");
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
}

export default new TripController(Trip);
