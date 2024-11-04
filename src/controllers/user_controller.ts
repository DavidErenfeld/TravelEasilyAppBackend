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

  // פונקציה לעדכון משתמש כולל הצפנת סיסמה
  async put(req: AuthRequest, res: Response) {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = encryptedPassword;
    }
    return super.put(req, res); // קריאה לפונקציה put מהמחלקה BaseController
  }

  // פונקציה להוספת טיול לרשימת המועדפים
  async addFavoriteTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user._id; // מזהה המשתמש
      const tripId = req.params.tripId; // מזהה הטיול

      // משתמשים ב-DataSource כדי לקבל את ה-Repository של המשתמשים
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        // בודק אם הטיול כבר קיים במועדפים של המשתמש
        if (!user.favoriteTrips.includes(tripId)) {
          user.favoriteTrips.push(tripId); // מוסיף את הטיול למועדפים
          await userRepository.save(user); // שומר את השינויים בבסיס הנתונים
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

  // פונקציה להסרת טיול מרשימת המועדפים
  async removeFavoriteTrip(req: AuthRequest, res: Response) {
    try {
      const userId = req.user._id; // מזהה המשתמש
      const tripId = req.params.tripId; // מזהה הטיול

      // משתמשים ב-DataSource כדי לקבל את ה-Repository של המשתמשים
      const userRepository = connectDB.getRepository(User);
      const user = await userRepository.findOne({ where: { _id: userId } });

      if (user) {
        // מסנן את מזהה הטיול מרשימת המועדפים
        user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
        await userRepository.save(user); // שומר את השינויים בבסיס הנתונים
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
}

export default new UserController(User);
