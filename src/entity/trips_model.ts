export interface ITrips {
  _id?: string;
  owner?: string;
  userName?: string;
  imgUrl?: string;
  typeTraveler: string;
  country: string;
  typeTrip: string;
  numOfDays: number;
  tripDescription: string[];
  numOfComments: number;
  numOfLikes: number;
  tripPhotos?: string[];
  comments?: IComment[];
  likes?: ILike[];
}

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

  @Column({ type: "int" })
  numOfDays: number;

  @Column("json", { nullable: true })
  tripPhotos: string[];

  @Column("simple-json")
  @Column("json")
  tripDescription: string[];

  @OneToMany(() => Comment, (comment) => comment.trip, { cascade: true })
  comments: Comment[];

  @Column({ type: "int", default: 0 })
  numOfComments: number;

  @OneToMany(() => Like, (like) => like.trip, { cascade: true })
  likes: Like[];

  @Column({ type: "int", default: 0 })
  numOfLikes: number;
}
