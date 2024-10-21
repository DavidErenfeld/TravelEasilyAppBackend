import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Comment } from "./comment_model";
import { Like } from "./like_model";
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

  @Column("json")
  tripDescription: string[];

  @Column("json", { nullable: true })
  tripPhotos: string[];

  @OneToMany(() => Comment, (comment) => comment.trip, { cascade: true })
  comments: Comment[];

  @Column({ type: "int", default: 0 })
  numOfComments: number;

  @OneToMany(() => Like, (like) => like.trip, { cascade: true })
  likes: Like[];

  @Column({ type: "int", default: 0 })
  numOfLikes: number;

  get numOfDays(): number {
    return this.tripDescription.length;
  }
}
