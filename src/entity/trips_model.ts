import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Comment, IComment } from "./comment_model";
import { ILike, Like } from "./like_model";
import { User } from "./users_model";

export interface ITrips {
  _id?: string;
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

@Entity()
export class Trip {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @ManyToOne(() => User, (user) => user.trips, { onDelete: "CASCADE" })
  owner: User;

  @Column({ type: "varchar", length: 255, nullable: true })
  userName: string;

  @Column({ type: "varchar", nullable: true })
  imgUrl: string;

  @Column({ type: "varchar" })
  typeTraveler: string;

  @Column({ type: "varchar" })
  country: string;

  @Column({ type: "varchar" })
  typeTrip: string;

  @Column("json", { nullable: true })
  tripPhotos: string[];

  @Column("json")
  tripDescription: string[];

  @OneToMany(() => Comment, (comment) => comment.trip, { cascade: true })
  comments: Comment[];

  @Column({ type: "int", default: 0 })
  numOfComments: number;

  @Column({ type: "int", default: 0 })
  numOfLikes: number;

  @OneToMany(() => Like, (like) => like.trip, { cascade: true })
  likes: Like[];

  get numOfDays(): number {
    return this.tripDescription.length;
  }
}
