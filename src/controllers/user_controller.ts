import { Request, Response } from "express";
import { EntityTarget } from "typeorm";
import { AuthRequest } from "../common/auth_middleware";
import { User } from "../entity/users_model";
import { BaseController } from "./base_controller";
import { IUser } from "../entity/users_model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connectDB from "../data-source";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { io } from "../services/socket";
import { Like } from "../entity/like_model";
import { Comment } from "../entity/comment_model";
import { Trip } from "../entity/trips_model";
dotenv.config();

// Nodemailer configuration with Gmail account
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
    console.log("User update attempt:", req.params.id);
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = encryptedPassword;
    }
    return super.put(req, res);
  }

  async addFavoriteTrip(req: AuthRequest, res: Response) {
    console.log("Adding favorite trip:", req.params.tripId);
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

          // שליחת אירוע למכשירים של המשתמש
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
        console.log("User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error adding favorite trip:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async removeFavoriteTrip(req: AuthRequest, res: Response) {
    console.log("Removing favorite trip:", req.params.tripId);
    try {
      const userId = req.user._id;
      const tripId = req.params.tripId;
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
        await userRepository.save(user);
        console.log("Trip removed from favorites successfully");

        // שליחת אירוע למכשירים של המשתמש
        io.emit("removeFavorite", { userId, tripId });

        return res.status(200).json({
          message: "Trip removed from favorites",
          favoriteTrips: user.favoriteTrips,
        });
      } else {
        console.log("User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error removing favorite trip:", error);
      return res.status(500).json({ message: "Internal server error", error });
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
      res.status(500).json({ message: "Internal server error", error: err });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body;
    console.log("Requesting password reset for email:", email);
    try {
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        console.log("User not found for email:", email);
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
      console.log("Password reset email sent successfully to:", email);
      return res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    console.log("Attempting to reset password for token:", token);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        _id: string;
      };
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({
        where: { _id: decoded._id },
      });

      if (!user) {
        console.log("User not found for token:", token);
        return res.status(404).json({ message: "User not found" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await userRepository.save(user);

      console.log("Password reset successfully for user:", user._id);
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
    console.log("Attempting to delete user:", req.params.id);
    const queryRunner = connectDB.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const userRepository = queryRunner.manager.getRepository(User);
      const likeRepository = queryRunner.manager.getRepository(Like);
      const commentRepository = queryRunner.manager.getRepository(Comment);
      const tripRepository = queryRunner.manager.getRepository(Trip);

      // Find the user to delete
      const user = await userRepository.findOne({
        where: { _id: req.params.id },
      });
      if (!user) {
        console.log("User not found:", req.params.id);
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch all comments by the user and their IDs
      const commentsToDelete = await commentRepository.find({
        where: { ownerId: req.params.id },
      });
      const deletedCommentIds = commentsToDelete.map((comment) => comment._id);

      // Calculate number of comments to subtract per trip
      const tripCommentCounts: Record<string, number> = {};
      commentsToDelete.forEach((comment) => {
        tripCommentCounts[comment.trip._id] =
          (tripCommentCounts[comment.trip._id] || 0) + 1;
      });

      // Update numOfComments for affected trips
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

      // Delete the user's comments
      await commentRepository.delete({ ownerId: req.params.id });

      // Fetch all likes by the user and their IDs
      const likesToDelete = await likeRepository.find({
        where: { owner: req.params.id },
      });
      const deletedLikeIds = likesToDelete.map((like) => like._id);

      // Update numOfLikes for affected trips
      likesToDelete.forEach(async (like) => {
        await tripRepository
          .createQueryBuilder()
          .update(Trip)
          .set({
            numOfLikes: () => `"numOfLikes" - 1`,
          })
          .where("_id = :tripId", { tripId: like.trip._id })
          .execute();
      });

      // Delete the user's likes
      await likeRepository.delete({ owner: req.params.id });

      // Fetch all trips owned by the user and their IDs
      const tripsToDelete = await tripRepository.find({
        where: { owner: user },
      });
      const deletedTripIds = tripsToDelete.map((trip) => trip._id);

      // Delete trips owned by the user
      await tripRepository.delete({ owner: user });

      // Delete the user
      await userRepository.delete(req.params.id);

      // Commit the transaction
      await queryRunner.commitTransaction();
      console.log("User and related data deleted successfully:", req.params.id);

      // Emit event to notify all clients about the deletion
      io.emit("userDeleted", {
        userId: req.params.id,
        deletedTripIds,
        deletedCommentIds,
        deletedLikeIds,
      });

      // Disconnect the user
      io.to(req.params.id).emit("disconnectUser");

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user and related data:", error);

      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();

      res.status(500).json({ message: "Internal server error", error });
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}

export default new UserController(User);
