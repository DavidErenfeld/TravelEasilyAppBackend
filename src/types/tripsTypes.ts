import { User } from "../entity/users_model";

export interface IComment {
  _id?: string;
  ownerId: string;
  owner: string;
  comment: string;
  date: Date;
  user?: User;
}

export interface ILike {
  owner: string;
  userName?: string;
}

export interface ITrips {
  _id?: string;
  slug?: string;
  owner?: User;
  userName?: string;
  imgUrl?: string;
  typeTraveler: string;
  country: string;
  typeTrip: string;
  tripDescription: string[];
  numOfComments: number;
  numOfLikes: number;
  tripPhotos?: string[];
  comments?: IComment[];
  likes?: ILike[];
  isLikedByCurrentUser?: boolean;
  isFavoritedByCurrentUser?: boolean;
}
