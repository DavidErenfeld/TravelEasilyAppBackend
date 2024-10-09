import request from "supertest";
import initApp from "../app";
import { Express } from "express";
import { IUser, User } from "../entity/users_model";
import connectDB from "../data-source";

let app: Express;
const user: IUser = {
  userName: "Jacob",
  email: "testUser@test.com",
  password: "1234567890",
  imgUrl: "",
};

beforeAll(async () => {
  app = await initApp();
  console.log("beforeAll");

  await connectDB
    .getRepository(User)
    .createQueryBuilder()
    .delete()
    .where("email = :email", { email: user.email }) // Replace 123 with the actual user ID
    .execute();
});

afterAll(async () => {
  connectDB.destroy();
});

let accessToken: string;
let refreshToken: string;
let newRefreshToken: string;

describe("Auth tests", () => {
  test("Test Register", async () => {
    const response = await request(app).post("/auth/register").send(user);
    user._id = response.body._id;
    expect(response.statusCode).toBe(201);
  });

  test("Test Register exist email", async () => {
    const response = await request(app).post("/auth/register").send(user);
    expect(response.statusCode).toBe(406);
  });

  test("Test Register missing password", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "test@test.com",
    });
    expect(response.statusCode).toBe(400);
  });

  test("Test Login", async () => {
    const response = await request(app).post("/auth/login").send(user);
    expect(response.statusCode).toBe(200);
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
  });

  test("Test verify correct password", async () => {
    const response = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .set("Authorization", "JWT " + accessToken)
      .send({ currentPassword: user.password });
    expect(response.statusCode).toBe(200);
    expect(response.body.isValid).toBe(true);
  });

  test("Test verify incorrect password", async () => {
    const response = await request(app)
      .post("/auth/verify-password/" + user._id)
      .set("Authorization", "JWT " + accessToken)
      .send({ currentPassword: "incorrectpassword" });
    expect(response.statusCode).toBe(200);
    expect(response.body.isValid).toBe(false);
  });

  test("Test verify missing parameters", async () => {
    const response = await request(app)
      .post("/auth/verify-password/" + user._id)
      .set("Authorization", "JWT " + accessToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Test forbidden access without token", async () => {
    const response = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .send({ currentPassword: user.password });
    expect(response.statusCode).toBe(401);
  });

  test("Test access with valid token", async () => {
    const response = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .send({ currentPassword: user.password })
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toBe(200);
  });

  test("Test access with invalid token", async () => {
    const response = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .send({ currentPassword: user.password })
      .set("Authorization", "JWT 1" + accessToken);
    expect(response.statusCode).toBe(401);
  });

  jest.setTimeout(35000); // 35 seconds

  test("Test access after timeout of token", async () => {
    await new Promise((resolve) => setTimeout(() => resolve("done"), 32000)); // 320 seconds
    const response = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .send({ currentPassword: user.password })
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).not.toBe(200);
  });

  test("Test refresh token", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .set("Authorization", "JWT " + refreshToken)
      .send();
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    const newAccessToken = response.body.accessToken;
    newRefreshToken = response.body.refreshToken;

    const response2 = await request(app)
      .post(`/auth/verify-password/${user._id}`)
      .send({ currentPassword: user.password })
      .set("Authorization", "JWT " + newAccessToken);
    expect(response2.statusCode).toBe(200);
  });

  test("Test double use of refresh token", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .set("Authorization", "JWT " + refreshToken)
      .send();
    expect(response.statusCode).not.toBe(200);

    //verify that the new token is not valid as well
    const response1 = await request(app)
      .post("/auth/refresh")
      .set("Authorization", "JWT " + newRefreshToken)
      .send();
    expect(response1.statusCode).not.toBe(200);
  });
  test("Test Login", async () => {
    const response = await request(app).post("/auth/login").send(user);
    expect(response.statusCode).toBe(200);
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
  });

  test("Test logout ", async () => {
    const response = await request(app)
      .post("/auth/logout") // Add a slash before the email
      .set("Authorization", "JWT " + refreshToken);
    expect(response.statusCode).toEqual(200);
  });
});
