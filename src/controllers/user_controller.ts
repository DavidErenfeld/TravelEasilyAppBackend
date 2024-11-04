import { EntityTarget } from "typeorm";
import { AuthRequest } from "../common/auth_middleware";
import { Response } from "express";
import { User } from "../entity/users_model";
import { BaseController } from "./base_controller";
import { IUser } from "../entity/users_model";
import bcrypt from "bcrypt";
import connectDB from "../data-source";

class UserController extends BaseController<IUser> {
  constructor(entity: EntityTarget<IUser>) {
    super(entity);
  }

  async put(req: AuthRequest, res: Response) {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = encryptedPassword;
    }
    return super.put(req, res);
  }

  async addFavoriteTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user._id;
      const tripId = req.params.tripId;

      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        if (!user.favoriteTrips) {
          user.favoriteTrips = [];
        }

        if (!user.favoriteTrips.includes(tripId)) {
          user.favoriteTrips.push(tripId);
          await userRepository.save(user);
          return res.status(200).json({
            message: "Trip added to favorites",
            favoriteTrips: user.favoriteTrips,
          });
        }
        return res
          .status(409)
          .json({ message: "Trip is already in favorites" });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error in addFavoriteTrip:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async removeFavoriteTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user._id;
      const tripId = req.params.tripId;

      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        if (!user.favoriteTrips) {
          user.favoriteTrips = [];
        }

        user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
        await userRepository.save(user);
        return res.status(200).json({
          message: "Trip removed from favorites",
          favoriteTrips: user.favoriteTrips,
        });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error in removeFavoriteTrip:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getFavoriteTripIds(req: AuthRequest, res: Response) {
    console.log(`Fetching favorite trip IDs for user: ${req.user._id}`);
    try {
      const userId = req.params.userId;
      const userRepository = connectDB.getRepository(User);

      const user = await userRepository.findOne({ where: { _id: userId } });
      if (!user) {
        console.log(`User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      const favoriteTripIds = user.favoriteTrips || [];
      console.log(`Favorite trip IDs for user ${userId}:`, favoriteTripIds);

      res.status(200).json(favoriteTripIds);
    } catch (err) {
      console.error("Error fetching favorite trip IDs:", err);
      res.status(500).json({ message: err.message });
    }
  }
}

export default new UserController(User);
