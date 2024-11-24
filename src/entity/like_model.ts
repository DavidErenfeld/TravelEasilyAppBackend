import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Trip } from "./trips_model";
import { User } from "./users_model";

export interface ILike {
  owner: string;
  userName?: string;
}
@Entity()
export class Like {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 255 })
  owner: string;

  @ManyToOne(() => Trip, (trip) => trip.likes, { onDelete: "CASCADE" })
  trip: Trip;

  @ManyToOne(() => User, (user) => user.likes, { onDelete: "CASCADE" })
  user: User;
}
