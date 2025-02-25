import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { AuthRequest } from "../common/auth_middleware";
import { User } from "../entity/users_model";
import { BaseController } from "./base_controller";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connectDB from "../data-source";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { io } from "../services/socket";
import { Like } from "../entity/like_model";
import { Comment } from "../entity/comment_model";
import { Trip } from "../entity/trips_model";
import { IUser } from "../types/userTypes";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
        if (!user.favoriteTrips) user.favoriteTrips = [];
        if (!user.favoriteTrips.includes(tripId)) {
          user.favoriteTrips.push(tripId);
          await userRepository.save(user);
          console.log("Trip added to favorites successfully");

          io.emit("addFavorite", { userId, tripId });

          return res.status(200).json({
            message: "Trip added to favorites",
            favoriteTrips: user.favoriteTrips,
          });
        }
        console.log("Trip already in favorites");
        return res
          .status(409)
          .json({ message: "Trip is already in favorites" });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error adding favorite trip:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async removeFavoriteTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user._id;
      const tripId = req.params.tripId;
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
        await userRepository.save(user);
        console.log("Trip removed from favorites successfully");

        io.emit("removeFavorite", { userId, tripId });

        return res.status(200).json({
          message: "Trip removed from favorites",
          favoriteTrips: user.favoriteTrips,
        });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error removing favorite trip:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async getFavoriteTripIds(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const userRepository = connectDB.getRepository(User);

      const user = await userRepository.findOne({ where: { _id: userId } });
      if (!user) {
        console.log(`User not found`);
        return res.status(404).json({ message: "User not found" });
      }

      const favoriteTripIds = user.favoriteTrips || [];

      res.status(200).json(favoriteTripIds);
    } catch (err) {
      console.error("Error fetching favorite trip IDs:", err);
      res.status(500).json({ message: "Internal server error", error: err });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      const resetLink = `https://travel-easily-app.netlify.app/reset-password?token=${token}`;
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Password Reset",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        _id: string;
      };
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({
        where: { _id: decoded._id },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await userRepository.save(user);

      return res
        .status(200)
        .json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({ message: "Token has expired" });
      }
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    const queryRunner = connectDB.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const userRepository = queryRunner.manager.getRepository(User);
      const likeRepository = queryRunner.manager.getRepository(Like);
      const commentRepository = queryRunner.manager.getRepository(Comment);
      const tripRepository = queryRunner.manager.getRepository(Trip);

      const user = await userRepository.findOne({
        where: { _id: req.params.id },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const commentsToDelete = await commentRepository.find({
        where: { ownerId: req.params.id },
        relations: ["trip"],
      });
      const deletedCommentIds = commentsToDelete.map((comment) => comment._id);

      const tripCommentCounts: Record<string, number> = {};
      commentsToDelete.forEach((comment) => {
        const tripId = comment.trip?._id;
        if (tripId) {
          tripCommentCounts[tripId] = (tripCommentCounts[tripId] || 0) + 1;
        }
      });

      for (const [tripId, count] of Object.entries(tripCommentCounts)) {
        await tripRepository
          .createQueryBuilder()
          .update(Trip)
          .set({
            numOfComments: () => `"numOfComments" - ${count}`,
          })
          .where("_id = :tripId", { tripId })
          .execute();
      }

      await commentRepository.delete({ ownerId: req.params.id });

      const likesToDelete = await likeRepository.find({
        where: { owner: req.params.id },
        relations: ["trip"],
      });
      const deletedLikeIds = likesToDelete.map((like) => like._id);

      const tripLikeCounts: Record<string, number> = {};
      likesToDelete.forEach((like) => {
        const tripId = like.trip?._id;
        if (tripId) {
          tripLikeCounts[tripId] = (tripLikeCounts[tripId] || 0) + 1;
        }
      });

      for (const [tripId, count] of Object.entries(tripLikeCounts)) {
        await tripRepository
          .createQueryBuilder()
          .update(Trip)
          .set({
            numOfLikes: () => `"numOfLikes" - ${count}`,
          })
          .where("_id = :tripId", { tripId })
          .execute();
      }

      await likeRepository.delete({ owner: req.params.id });

      const tripsToDelete = await tripRepository.find({
        where: { owner: user },
      });
      const deletedTripIds = tripsToDelete.map((trip) => trip._id);

      if (tripsToDelete.length > 0) {
        await tripRepository.delete({ owner: user });
      }

      await userRepository.delete(req.params.id);

      await queryRunner.commitTransaction();

      io.emit("userDeleted", {
        userId: req.params.id,
        deletedTripIds,
        deletedCommentIds,
        deletedLikeIds,
      });

      io.to(req.params.id).emit("disconnectUser");

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user and related data:", error);

      await queryRunner.rollbackTransaction();

      res.status(500).json({ message: "Internal server error", error });
    } finally {
      await queryRunner.release();
    }
  }
}

export default new UserController(User);
