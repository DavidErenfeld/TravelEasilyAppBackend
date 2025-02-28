import { Trip } from "../entity/trips_model";
import { IComment } from "../types/tripsTypes";

export function mapTripToResponse(
  trip: Trip,
  userId: string | null,
  favoriteTripsIds: string[],
  detailed: boolean = false
) {
  const likesArray = trip.likes ?? [];
  const commentsArray = trip.comments ?? [];
  const isLikedByCurrentUser = userId
    ? likesArray.some((like) => like.owner === userId)
    : false;
  const isFavoritedByCurrentUser = userId
    ? favoriteTripsIds.includes(trip._id)
    : false;

  const ownerData: { userName: string; imgUrl: string; _id?: string } = {
    userName: trip.owner ? trip.owner.userName : trip.userName,
    imgUrl: trip.owner ? trip.owner.imgUrl : trip.imgUrl,
  };
  if (detailed && trip.owner && userId === trip.owner._id) {
    ownerData._id = trip.owner._id;
  }

  const commentsData = commentsArray.map((comment: IComment) => {
    const commentObj: any = {
      _id: comment._id,
      owner: comment.owner,
      comment: comment.comment,
      date: comment.date,
    };
    if (detailed) {
      commentObj.ownerId = comment.ownerId;
      commentObj.imgUrl = comment.user ? comment.user.imgUrl : "";
    }
    return commentObj;
  });

  return {
    _id: trip._id,
    slug: trip.slug,
    typeTraveler: trip.typeTraveler,
    country: trip.country,
    typeTrip: trip.typeTrip,
    tripDescription: trip.tripDescription,
    tripPhotos: trip.tripPhotos,
    numOfComments: trip.numOfComments,
    numOfLikes: trip.numOfLikes,
    owner: ownerData,
    comments: commentsData,
    isLikedByCurrentUser,
    isFavoritedByCurrentUser,
  };
}

export function sanitizeTrips(
  trips: Trip[],
  userId: string | null,
  favoriteTripsIds: string[]
) {
  return trips.map((trip) =>
    mapTripToResponse(trip, userId, favoriteTripsIds, false)
  );
}

export function sanitizeTrip(
  trip: Trip,
  userId: string | null,
  favoriteTripsIds: string[]
) {
  return mapTripToResponse(trip, userId, favoriteTripsIds, true);
}
