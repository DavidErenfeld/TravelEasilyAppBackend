import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Trip } from "./trips_model";
import { User } from "./users_model";

@Entity()
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 255 })
  ownerId: string;

  @Column({ type: "varchar", length: 255 })
  owner: string;

  @Column({ type: "text" })
  comment: string;

  @Column({ type: "date" })
  date: Date;

  @ManyToOne(() => Trip, (trip) => trip.comments, { onDelete: "CASCADE" })
  trip: Trip;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: "CASCADE" }) // קשר למשתמש
  user: User;
}
