import slugify from "slugify";
import { User } from "../entity/users_model";
import tripRepository from "../repositories/tripRepository";
import userRepository from "../repositories/userRepository";
import { IComment, ITrips } from "../types/tripsTypes";
import { sanitizeTrips, sanitizeTrip } from "../utils/tripsUtils";

export const generateUniqueSlug = async (country: string, typeTrip: string) => {
  let slug = slugify(`${country}-${typeTrip}`, { lower: true });
  let existingTrip = await tripRepository.findBySlug(slug);
  let counter = 1;
  while (existingTrip) {
    slug = slugify(`${country}-${typeTrip}-${counter}`, { lower: true });
    existingTrip = await tripRepository.findBySlug(slug);
    counter++;
  }
  return slug;
};

export const createTripObject = (
  owner: User,
  requestData: any,
  slug: string
) => {
  return {
    owner,
    userName: owner.userName,
    imgUrl: owner.imgUrl || null,
    typeTraveler: requestData.typeTraveler,
    country: requestData.country,
    typeTrip: requestData.typeTrip,
    slug,
    tripDescription: requestData.tripDescription,
    tripPhotos: requestData.tripPhotos || [],
    numOfComments: 0,
    numOfLikes: 0,
    comments: [],
    likes: [],
  };
};

export const createCommentObject = (userId: string, commentData: IComment) => {
  return {
    ownerId: userId,
    ...commentData,
  };
};

export const getTripsByOwner = async (
  ownerId: string,
  currentUserId: string | null
) => {
  const trips = await tripRepository.getTripsByOwnerId(ownerId);
  let favoriteTripsIds: string[] = [];
  if (currentUserId) {
    favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(
      currentUserId
    );
  }
  return sanitizeTrips(trips, currentUserId, favoriteTripsIds);
};

export const getTripsByParams = async (
  queryParams: Record<string, string>,
  currentUserId: string | null
) => {
  const whereCondition: Record<string, string | number | boolean> = {};
  let numOfDaysCondition: number | null = null;
  for (const [key, value] of Object.entries(queryParams)) {
    if (key === "numOfDays" && typeof value === "string") {
      numOfDaysCondition = parseInt(value, 10);
    } else if (typeof value === "string") {
      whereCondition[key] = value;
    }
  }
  const trips = await tripRepository.getTripsByParams(
    whereCondition,
    numOfDaysCondition
  );
  let favoriteTripsIds: string[] = [];
  if (currentUserId) {
    favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(
      currentUserId
    );
  }
  return sanitizeTrips(trips, currentUserId, favoriteTripsIds);
};

export const getFavoriteTrips = async (userId: string) => {
  const favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(userId);
  if (favoriteTripsIds.length === 0) {
    return [];
  }
  const trips = await tripRepository.getTripsByIds(favoriteTripsIds);
  return sanitizeTrips(trips, userId, favoriteTripsIds);
};

export const addTrip = async (userId: string, requestData: ITrips) => {
  const owner = await userRepository.getUserById(userId);
  if (!owner) {
    return null;
  }
  const slug = await generateUniqueSlug(
    requestData.country,
    requestData.typeTrip
  );
  const newTripData = createTripObject(owner, requestData, slug);
  const createdTrip = await tripRepository.addTrip(newTripData);
  const favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(userId);
  return sanitizeTrip(createdTrip, userId, favoriteTripsIds);
};

export const addComment = async (tripId: string, newComment: IComment) => {
  const updatedTrip = await tripRepository.addCommentToTrip(tripId, newComment);
  if (!updatedTrip) {
    throw new Error("Trip not found");
  }
  return updatedTrip.comments;
};

export const updateTrip = async (
  tripId: string,
  userId: string,
  updateData: Partial<ITrips>
) => {
  const trip = await tripRepository.getTripWithOwner(tripId);
  if (!trip) {
    throw new Error("Trip not found");
  }
  if (trip.owner._id !== userId) {
    throw new Error("You are not authorized to update this trip");
  }
  const oldCountry = trip.country;
  const oldTypeTrip = trip.typeTrip;
  trip.typeTraveler = updateData.typeTraveler;
  trip.country = updateData.country;
  trip.typeTrip = updateData.typeTrip;
  trip.tripDescription = updateData.tripDescription;
  trip.tripPhotos = updateData.tripPhotos;
  if (trip.country !== oldCountry || trip.typeTrip !== oldTypeTrip) {
    trip.slug = await generateUniqueSlug(trip.country, trip.typeTrip);
  }
  const savedTrip = await tripRepository.updateTrip(trip);
  const favoriteTripsIds = await userRepository.getUserFavoriteTripsIds(userId);
  return sanitizeTrip(savedTrip, userId, favoriteTripsIds);
};

export const deleteComment = async (tripId: string, commentId: string) => {
  const trip = await tripRepository.getTripById(tripId);
  if (!trip) {
    throw new Error("Trip not found");
  }
  const updatedTrip = await tripRepository.removeCommentFromTrip(
    trip,
    commentId
  );
  return updatedTrip.comments;
};

export const deleteTrip = async (tripId: string) => {
  const deleteResult = await tripRepository.deleteTripById(tripId);
  if (!deleteResult.affected) {
    throw new Error("Trip not found");
  }
  await userRepository.removeTripFromAllFavorites(tripId);
};
