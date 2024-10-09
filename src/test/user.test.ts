import request from "supertest";
import { Express } from "express";
import initApp from "../app";
import { IUser, User } from "../entity/users_model";
import connectDB from "../data-source";

const user: IUser = {
  email: "test@trip.com",
  password: "12345667867",
  userName: "yechiel",
  imgUrl: "test/test",
};
let accessToken: string;
let app: Express;

beforeAll(async () => {
  app = await initApp();
  console.log("beforeAll");

  await connectDB
    .getRepository(User)
    .createQueryBuilder()
    .delete()
    .where("email = :email", { email: user.email }) // Replace 123 with the actual user ID
    .execute();
  const response1 = await request(app).post("/auth/register").send(user);
  user._id = response1.body._id;
  const response2 = await request(app).post("/auth/login").send(user);
  accessToken = response2.body.accessToken;
});

afterAll((done) => {
  connectDB.destroy();
  done();
});

describe("--User Tests--", () => {
  test("Test Get user info", async () => {
    const response = await request(app)
      .get("/users/" + user._id)
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(user._id);
  });

  test("Update User Profile", async () => {
    const updatedUserData = {
      userName: "jacob",
      imgUrl: "https://example.com/profile.jpg",
    };

    const response = await request(app)
      .put("/users/" + user._id)
      .set("Authorization", "JWT " + accessToken)
      .send(updatedUserData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("imgUrl", updatedUserData.imgUrl);
    expect(response.body).toHaveProperty("userName", updatedUserData.userName);

    user.imgUrl = updatedUserData.imgUrl;
    user.userName = updatedUserData.userName;
  });

  test("Update User Profile failed", async () => {
    const updatedUserData = {
      userName: "jacob",
      imgUrl: "https://example.com/profile.jpg",
    };

    const res = await request(app)
      .put("/users/" + 232323)
      .set("Authorization", "JWT " + accessToken)
      .send(updatedUserData);
    expect(res.status).toBe(404);
  });

  test("Test 7 delete user by id", async () => {
    console.log("delete user by id");
    const response = await request(app)
      .get("/users/" + user._id)
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    // console.log(`=============${user._id}===============`);
    const res = await request(app)
      .delete("/users/" + data._id)
      .set("Authorization", "JWT " + accessToken)
      .send();

    expect(res.statusCode).toBe(200);
  });
});
