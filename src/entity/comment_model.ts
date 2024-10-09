import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Trip } from "./trips_model";

export interface IComment {
  _id?: string;
  ownerId: string;
  owner: string;
  // imgUrl?: string;
  comment: string;
  date: Date;
}

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

  // @Column({ type: "text" })
  // imgUrl: string;

  @Column({ type: "date" })
  date: Date;

  @ManyToOne(() => Trip, (trip) => trip.comments, { onDelete: "CASCADE" })
  trip: Trip;
}
