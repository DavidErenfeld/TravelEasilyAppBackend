import { Trip } from "../entity/trips_model";
import { In } from "typeorm";
import { User } from "../entity/users_model";
import { Like } from "../entity/like_model";
import connectDB from "../data-source";

class TripRepository {
  repository = connectDB.getRepository(Trip);

  async getTripById(tripId: string) {
    return this.repository.findOne({
      where: { _id: tripId },
      relations: ["comments", "likes"],
    });
  }

  async getAllTrips(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.repository.findAndCount({
      relations: ["owner", "likes", "comments"],
      skip,
      take: limit,
    });
  }

  async getTripsByOwnerId(ownerId: string) {
    return this.repository
      .createQueryBuilder("trip")
      .leftJoinAndSelect("trip.owner", "owner")
      .leftJoinAndSelect("trip.likes", "likes")
      .leftJoinAndSelect("trip.comments", "comments")
      .where("owner._id = :ownerId", { ownerId })
      .getMany();
  }

  async getTripBySlug(slug: string) {
    return this.repository.findOne({
      where: { slug },
      relations: ["comments", "comments.user", "likes", "owner"],
    });
  }

  async findBySlug(slug: string) {
    return this.repository.findOne({ where: { slug } });
  }

  async getTripsByParams(
    whereCondition: Record<string, string | number | boolean>,
    numOfDaysCondition: number | null
  ) {
    const query = this.repository
      .createQueryBuilder("trip")
      .leftJoinAndSelect("trip.owner", "owner")
      .leftJoinAndSelect("trip.likes", "likes")
      .leftJoinAndSelect("trip.comments", "comments")
      .where(whereCondition);
    if (numOfDaysCondition !== null) {
      query.andWhere('json_array_length(trip."tripDescription") = :numOfDays', {
        numOfDays: numOfDaysCondition,
      });
    }
    return query.getMany();
  }

  async getTripsByIds(tripIds: string[]) {
    return this.repository.find({
      where: { _id: In(tripIds) },
      relations: ["owner", "likes", "comments"],
    });
  }

  async getLikesWithUserDetails(tripId: string) {
    return this.repository
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
  }

  async addTrip(newTrip: any) {
    return this.repository.save(newTrip);
  }

  async addCommentToTrip(tripId: string, newComment: any) {
    const trip = await this.repository.findOne({
      where: { _id: tripId },
      relations: ["comments"],
    });
    if (!trip) return null;
    trip.comments.push(newComment);
    trip.numOfComments = trip.comments.length;
    return this.repository.save(trip);
  }

  async toggleLike(tripId: string, userId: string) {
    const likeRepository = connectDB.getRepository(Like);
    const existingLike = await likeRepository.findOne({
      where: { trip: { _id: tripId }, owner: userId },
    });
    if (!existingLike) {
      const newLike = likeRepository.create({
        owner: userId,
        trip: { _id: tripId },
      });
      await likeRepository.save(newLike);
      // Update trip's like count
      const trip = await this.repository.findOne({
        where: { _id: tripId },
        relations: ["likes"],
      });
      if (trip) {
        trip.numOfLikes = trip.likes.length;
        await this.repository.save(trip);
      }
      return { action: "likeAdded" };
    }
    await likeRepository.remove(existingLike);
    // Update trip's like count
    const trip = await this.repository.findOne({
      where: { _id: tripId },
      relations: ["likes"],
    });
    if (trip) {
      trip.numOfLikes = trip.likes.length;
      await this.repository.save(trip);
    }
    return { action: "likeRemoved" };
  }

  async getTripWithOwner(tripId: string) {
    return this.repository.findOne({
      where: { _id: tripId },
      relations: ["owner"],
    });
  }

  async updateTrip(trip: Trip) {
    return this.repository.save(trip);
  }

  async deleteTripById(tripId: string) {
    return this.repository.delete(tripId);
  }

  async removeCommentFromTrip(trip: Trip, commentId: string) {
    trip.comments = trip.comments.filter(
      (comment) => comment._id.toString() !== commentId
    );
    trip.numOfComments = trip.comments.length;
    return this.repository.save(trip);
  }
}

export default new TripRepository();
