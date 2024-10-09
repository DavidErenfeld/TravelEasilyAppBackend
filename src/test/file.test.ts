import initApp from "../app";
import request from "supertest";
import { Express } from "express";
import connectDB from "../data-source";

let app: Express;

beforeAll(async () => {
  app = await initApp();
  console.log("beforeAll");
});

afterAll(async () => {
  connectDB.destroy();
});

describe("File Tests", () => {
  test("upload file", async () => {
    const filePath = `${__dirname}/user.png`;
    console.log(filePath);

    try {
      const response = await request(app)
        .post("/file?file=123.webp")
        .attach("file", filePath);
      expect(response.statusCode).toEqual(200);
      let url = response.body.url;
      console.log(url);
      url = url.replace(/^.*\/\/[^/]+/, "");
      const res = await request(app).get(url);
      expect(res.statusCode).toEqual(200);
    } catch (err) {
      console.log(err);
      expect(1).toEqual(2);
    }
  });
});
