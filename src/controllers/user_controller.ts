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
    try {
      const result = await this.entity.delete(req.params.id);
      if (result.affected === 0) {
        console.log("User not found:", req.params.id);
        return res.status(404).json({ message: "User not found" });
      }

      // Sending Socket event to disconnect all user connections
      io.to(req.params.id).emit("disconnectUser");

      console.log("User deleted successfully:", req.params.id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  }
}

export default new UserController(User);
