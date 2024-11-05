import { EntityTarget } from "typeorm";
import { AuthRequest } from "../common/auth_middleware";
import { Request, Response } from "express";
import { User } from "../entity/users_model";
import { BaseController } from "./base_controller";
import { IUser } from "../entity/users_model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // ייבוא jwt
import connectDB from "../data-source";
import nodemailer from "nodemailer";
import dotenv from "dotenv"; // ייבוא dotenv
import { io } from "../services/socket";
dotenv.config();

// הגדרת Nodemailer עם חשבון Gmail
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

  async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body;
    const userRepository = connectDB.getRepository(User);

    try {
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
      console.error("Error in requestPasswordReset:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    const userRepository = connectDB.getRepository(User);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        _id: string;
      };
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
      console.error("Error in resetPassword:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({ message: "Token has expired" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    console.log("Deleting user...");
    try {
      const result = await this.entity.delete(req.params.id);
      if (result.affected === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // שליחת אירוע Socket לניתוק כל החיבורים של המשתמש
      io.to(req.params.id).emit("disconnectUser");

      console.log("User deleted successfully:", req.params.id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error in user deletion:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  }
}

export default new UserController(User);
