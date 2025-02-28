import { Response } from "express";
import { EntityTarget } from "typeorm";
import { AuthRequest } from "../common/auth_middleware";
import { io } from "../services/socket";
import { BaseController } from "./base_controller";
import { Trip } from "../entity/trips_model";
import { renderSingleTripAsHtml, renderTripsAsHtml } from "../utils/renderHtml";
import { isBotRequest } from "../utils/botDetection";
import { sanitizeTrips, sanitizeTrip } from "../utils/tripsUtils";
import { ITrips } from "../types/tripsTypes";
import tripRepository from "../repositories/tripRepository";
import userRepository from "../repositories/userRepository";
import {
  getTripsByOwner as getTripsByOwnerService,
  getTripsByParams as getTripsByParamsService,
  getFavoriteTrips as getFavoriteTripsService,
  addTrip as addTripService,
  addComment as addCommentService,
  updateTrip as updateTripService,
  deleteComment as deleteCommentService,
  deleteTrip as deleteTripService,
  createCommentObject,
} from "../services/tripService";

class TripController extends BaseController<ITrips> {
  constructor(entity: EntityTarget<ITrips>) {
    super(entity);
  }

  async getAllTrips(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const [trips, total] = await tripRepository.getAllTrips(page, limit);

      const userAgent = req.headers["user-agent"] || "";
      const isBot = isBotRequest(userAgent);
      if (isBot) {
        const html = renderTripsAsHtml(trips);

        return res.send(html);
      }

      let favoriteTripsIds: string[] = [];
      const userId = req.user ? req.user._id : null;
      if (userId) {
        favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(userId);
      }
      const sanitizedTrips = sanitizeTrips(trips, userId, favoriteTripsIds);
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
      const trips = await getTripsByOwnerService(
        ownerId,
        req.user ? req.user._id : null
      );
      return res.status(trips.length > 0 ? 200 : 404).json(trips);
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

      const trip = await tripRepository.getTripBySlug(slug);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (isBot) {
        const html = renderSingleTripAsHtml(trip);
        return res.send(html);
      }

      const userId = req.user ? req.user._id : null;
      let favoriteTripsIds: string[] = [];
      if (userId) {
        favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(userId);
      }

      const enrichedTrip = sanitizeTrip(trip, userId, favoriteTripsIds);

      res.status(200).json(enrichedTrip);
    } catch (err) {
      console.error("Error fetching trip with slug:", err);
      res.status(500).json({ message: err.message });
    }
  }

  async getTripsByParams(req: AuthRequest, res: Response) {
    try {
      const queryParams: Record<string, string> = Object.fromEntries(
        Object.entries(req.query).map(([key, value]) => [key, String(value)])
      );

      const trips = await getTripsByParamsService(
        queryParams,
        req.user ? req.user._id : null
      );
      res.status(200).json(trips);
    } catch (err) {
      console.error("Error fetching trips:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getFavoriteTrips(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id || req.params.userId;
      const trips = await getFavoriteTripsService(userId);
      res.status(200).json(trips);
    } catch (err) {
      console.error("Error fetching favorite trips:", err);
      res.status(500).json({ message: err.message });
    }
  }

  async getLikesWithUserDetails(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const tripWithLikes = await tripRepository.getLikesWithUserDetails(
        tripId
      );
      if (!tripWithLikes) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (!tripWithLikes.likes || tripWithLikes.likes.length === 0) {
        return res.status(200).json({
          message: "No likes found for this trip.",
          totalLikes: 0,
          likesDetails: [],
        });
      }
      const likesDetails = tripWithLikes.likes.map((like: any) => ({
        userName: like.ownerDetails?.userName || "Unknown User",
        imgUrl: like.ownerDetails?.imgUrl || "",
      }));
      res.status(200).json({
        totalLikes: likesDetails.length,
        likesDetails,
      });
    } catch (error: any) {
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
      const createdTrip = await addTripService(userId, req.body);
      if (!createdTrip) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(201).json(createdTrip);
    } catch (error: any) {
      console.error("Error creating trip:", error.message);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async addComment(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const newComment = createCommentObject(req.user._id, req.body.comment);
      const comments = await addCommentService(tripId, newComment);
      io.emit("commentAdded", { tripId, newComment });
      res.status(200).json(comments);
    } catch (error: any) {
      if (error.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      console.error("Error in addComment:", error.message);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async handleLike(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const userId = req.user._id;
      const { action } = await tripRepository.toggleLike(tripId, userId);
      io.emit(action, { tripId, userId });
      res.sendStatus(200);
    } catch (error: any) {
      console.error("Error in handleLike:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateTrip(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.id;
      const userId = req.user?._id;
      const updatedTrip = await updateTripService(tripId, userId, req.body);
      res.status(200).json(updatedTrip);
    } catch (err: any) {
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (err.message === "You are not authorized to update this trip") {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this trip" });
      }
      console.error("Failed to update trip:", err);
      res
        .status(500)
        .json({ message: "Error updating trip", error: err.message });
    }
  }

  async deleteComment(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.tripId;
      const commentId = req.params.commentId;
      const comments = await deleteCommentService(tripId, commentId);
      io.emit("commentDeleted", { tripId, commentId });
      res.status(200).json(comments);
    } catch (err: any) {
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      console.error("Error in deleteComment:", err.message);
      res
        .status(500)
        .json({ message: "Internal server error", error: err.message });
    }
  }

  async deleteTrip(req: AuthRequest, res: Response) {
    try {
      const tripId = req.params.id;
      await deleteTripService(tripId);
      io.emit("tripDeleted", { tripId });
      res.status(200).json({ message: "Trip deleted successfully" });
    } catch (err: any) {
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      console.error("Error deleting trip:", err);
      res
        .status(500)
        .json({ message: "Error deleting trip", error: err.message });
    }
  }
}

export default new TripController(Trip);
