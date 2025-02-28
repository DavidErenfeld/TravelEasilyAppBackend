import { User } from "../entity/users_model";
import connectDB from "../data-source";

class UserRepository {
  repository = connectDB.getRepository(User);

  async getUserById(userId: string) {
    return this.repository.findOne({ where: { _id: userId } });
  }

  async getUserFavoriteTripsIds(userId: string) {
    const user = await this.repository.findOne({
      where: { _id: userId },
      select: ["favoriteTrips"],
    });
    return user?.favoriteTrips || [];
  }

  async removeTripFromAllFavorites(tripId: string) {
    const usersWithFavoriteTrip = await this.repository
      .createQueryBuilder("user")
      .where(":tripId = ANY(user.favoriteTrips)", { tripId })
      .getMany();

    for (const user of usersWithFavoriteTrip) {
      user.favoriteTrips = user.favoriteTrips.filter((id) => id !== tripId);
      await this.repository.save(user);
    }
  }
}

export default new UserRepository();
