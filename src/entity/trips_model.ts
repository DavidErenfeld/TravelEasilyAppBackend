import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import slugify from "slugify";
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

  @Column({ type: "varchar", unique: true, nullable: true })
  slug: string;

  get numOfDays(): number {
    return this.tripDescription.length;
  }

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (!this.slug || this.slug.trim() === "") {
      this.slug = slugify(`${this.country}-${this.typeTrip}`, { lower: true });
    }
  }
}
