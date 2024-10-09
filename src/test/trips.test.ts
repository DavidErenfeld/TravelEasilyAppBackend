import request from "supertest";
import { Express } from "express";
import initApp from "../app";
import { IUser, User } from "../entity/users_model";
import connectDB from "../data-source";
import { ITrips } from "../entity/trips_model";
import { v4 as uuidv4 } from "uuid";

const user: IUser = {
  email: "test@trip.com",
  password: "12345667867",
  userName: "moshe",
  imgUrl: "test/test",
};
let accessToken: string;
let app: Express;
let userId: string;
let userName: string;

//Delete DB before test
beforeAll(async () => {
  app = await initApp();
  console.log("beforeAll");
  await connectDB.getRepository(User).createQueryBuilder().delete().execute();
  // .where("email = :email", { email: user.email }) // Replace 123 with the actual user ID
  const response1 = await request(app).post("/auth/register").send(user);
  userId = response1.body._id;
  userName = response1.body.userName; // שמירת ה-_id של המשתמש לשימוש בבדיקות
  const response2 = await request(app).post("/auth/login").send(user);
  accessToken = response2.body.accessToken;
});
afterAll(async () => {
  await connectDB.destroy();
});
describe("--Trips Tests--", () => {
  const trip1: ITrips = {
    userName: "aa",
    // owner: "David",
    typeTraveler: "type Traveler",
    country: "Country",
    typeTrip: "type Trip",
    numOfDays: 2,
    tripDescription: ["aa", "bb"],
    numOfComments: 0,
    numOfLikes: 0,
  };

  const trip2: ITrips = {
    owner: "moshe",
    userName: "aa",
    typeTraveler: "type Traveler 2",
    country: "Country 2",
    typeTrip: "type Trip 2",
    numOfDays: 1,
    tripDescription: ["tripDescription 2"],
    numOfComments: 0,
    numOfLikes: 0,
  };
  const nonExistingId = uuidv4();
  //FUNCTION  Add a new trip and send to the DB
  const addNewTrip = async (trip: ITrips) => {
    const response = await request(app)
      .post("/trips")
      .set("Authorization", "JWT " + accessToken)
      .send(trip);
    console.log(`----------------------${response}`);

    expect(response.statusCode).toEqual(200);
  };

  test("1 Test get all trips - empty collection", async () => {
    console.log("Test get all trips -- 0 trips");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    // console.log(`=================${response}==================`);
    expect(response.statusCode).toEqual(200);
    const data = response.body;
    // console.log(`=================${data}==================`);
    expect(data.length).toEqual(0);
  });

  test("Test 2 add new trip", async () => {
    console.log("Test add new trip");
    const response = await addNewTrip(trip1);
  });

  test("3 Test get all trips - 1 trip", async () => {
    console.log("Test get all trips -- 1 trip");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(200);
    const data = response.body;
    expect(data.length).toEqual(1);
  });

  test("Test 4 get by owner", async () => {
    console.log("Test get by owner");
    const response = await request(app)
      .get(`/trips/owner/${userId}`)
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(200);
  });

  test("Test 4.1 get by owner --file", async () => {
    console.log("Test get by owner --file");
    //Test if status cod == 200
    const response = await request(app)
      .get(`/trips/owner/${nonExistingId}`)
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(201);
  });

  test("Test 4.3 get by tripId ", async () => {
    console.log("Test get by tripId");
    const response1 = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response1.body;
    const trip = data[0];
    trip1._id = trip._id;

    const response2 = await request(app)
      .get(`/trips/${trip._id}`)
      .set("Authorization", "JWT " + accessToken);
    expect(response2.statusCode).toEqual(200);
  });

  test("Test 4.4 get by tripId --null", async () => {
    console.log("Test get by tripId --null");
    const response1 = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response1.body;
    const trip = data[0];

    const response2 = await request(app)
      .get(`/trips/${trip._id}dd`)
      .set("Authorization", "JWT " + accessToken);
    expect(response2.statusCode).toEqual(500);
  });

  test("Test 5 update trip by id", async () => {
    console.log("update trip by id - Starting test");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const updateTrip = data[0];
    const res = await request(app)
      .put(`/trips/${updateTrip._id}`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        _id: updateTrip._id,
        country: "update country",
        numOfDays: 1,
        tripDescription: "update tripDescription",
      });
    expect(res.status).toBe(200);
  });

  test("Test 5.1 update trip by id-- fail", async () => {
    console.log("update user by id-- fail");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const updateTrip = data[0];
    const res = await request(app)
      .put(`/trips/${updateTrip._id}dd`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "Davhntbgrvid",
        country: "Countnhtbgrvry",
        numOfDays: 1,
        tripDescription: ",oimunytbr",
      });
    expect(res.statusCode).toBe(404);
  });

  test("Test 5.2 update trip by id-- fail--id is not found", async () => {
    console.log("update user by id-- fail--id is not found");

    const res = await request(app)
      .put(`/trips/${nonExistingId}`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "Davhntbgrvid",
        country: "Countnhtbgrvry",
        numOfDays: 1,
        tripDescription: ",oimunytbr",
      });

    expect(res.statusCode).toBe(404);
  });

  test("Test 6 add new trip and get all trips - 2 trips", async () => {
    console.log("Test add new trip");
    await addNewTrip(trip2);
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(200);

    //Test if the collection is empty
    const data = response.body;
    expect(data.length).toEqual(2);
  });

  test("Test 7 delete trip by id", async () => {
    console.log("delete trip by id");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const trip = data[1];
    // console.log(`=============${user._id}===============`);
    const res = await request(app)
      .delete(`/trips/${trip._id}`)
      .set("Authorization", "JWT " + accessToken)
      .send();

    expect(res.statusCode).toBe(200);
  });

  test("Test 7.1 delete trip by id -- file--id not found", async () => {
    console.log("delete trip by id -- -- file--id not found");

    const res = await request(app)
      .delete(`/trips/${nonExistingId}`)
      .set("Authorization", "JWT " + accessToken)
      .send();

    expect(res.statusCode).toBe(504);
  });

  test("Test 7.2 delete trip by id -- file-- server err", async () => {
    console.log("delete trip by id -- -- file-- server err");

    const res = await request(app)
      .delete(`/trips/${nonExistingId}2`)
      .set("Authorization", "JWT " + accessToken)
      .send();

    expect(res.statusCode).toBe(404);
  });

  test("Test 8 get all trips - 1 trip", async () => {
    console.log("Test get all trips -- 1 trip");
    //Test if status cod == 200
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(200);

    //Test if the collection is empty
    const data = response.body;
    expect(data.length).toEqual(1);
  });

  test("Test 9 Add comment to a trip", async () => {
    console.log("Add comment to a trip");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const trip = data[0];
    const res = await request(app)
      .post(`/trips/${trip._id}/comments`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        comment: {
          owner: user.userName,
          comment: "This is a test comment",
          date: new Date(),
        }
      });

    expect(res.statusCode).toBe(200);
  });

  test("Test 9.1 Add comment to a trip --file Trip not found", async () => {
    console.log("Add comment to a trip --file Trip not found");

    const res = await request(app)
      .post(`/trips/${nonExistingId}/comments`)
      .set("Authorization", "JWT " + accessToken)

      .send({
        comment: {
          owner: "David",
          comment: "This is a test comment",
        }
      });


    expect(res.statusCode).toBe(404);
  });

  test("Test 9.1 Add comment to a trip --file Server err", async () => {
    console.log("Add comment to a trip --file Server err");

    const res = await request(app)
      .post(`/trips/${nonExistingId}12/comments`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        comment: {
        owner: "David",
        comment: "This is a test comment",
        date: new Date(),
        }
      });

    expect(res.statusCode).toBe(500);
  });

  test("Test delete comment ", async () => {
    console.log("Test delete comment");
    const response = await request(app)
      .get(`/trips/FullTrip/${trip1._id}`)
      .set("Authorization", "JWT " + accessToken);
    expect(response.statusCode).toEqual(200);
    const trip = response.body;

    const res = await request(app)
      .delete(`/trips/${trip._id}/${trip.comments[0]._id}`)
      .set("Authorization", "JWT " + accessToken);

    expect(res.statusCode).toBe(200);
  });

  test("Test delete comment -- fail ", async () => {
    const res = await request(app)
      .delete(`/trips/${nonExistingId}/${nonExistingId}`)
      .set("Authorization", "JWT " + accessToken);

    expect(res.statusCode).toBe(404);
  });

  test("Test 10 Add like to a trip", async () => {
    console.log("Add like to a trip");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const trip = data[0];

    const res = await request(app)
      .post(`/trips/${trip._id}/likes/`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "David",
      });
    expect(res.statusCode).toBe(200);
  });

  test("Test 10.1 Add 2 likes to a trip", async () => {
    console.log("Add 2 likes to a trip");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const trip = data[0];
    const res = await request(app)
      .post(`/trips/${trip._id}/likes/`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "David",
      });

    expect(res.statusCode).toBe(200);
  });

  test("Test 10.2 Add like to a tripn --file Trip not found", async () => {
    console.log("Add like to a trip --file Trip not found");

    const res = await request(app)
      .post(`/trips/${trip2._id}/likes/`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "David",
      });

    expect(res.statusCode).toBe(500);
  });

  test("Test 10.3 Add like to a tripn --Server err", async () => {
    console.log("Add like to a trip --Server err");

    const res = await request(app)
      .get(`/trips/${nonExistingId}12/likes/`)
      .set("Authorization", "JWT " + accessToken)
      .send({
        owner: "David",
      });

    expect(res.statusCode).toBe(404);
  });

test("Test search trips by parameter", async () => {
  try {
    // Search for the trip

    const searchResponse = await request(app)
    .get(`/trips//search/parameters`)
    .set("Authorization", "JWT " + accessToken)
    .query({ country: "update country",tripDescription: "update tripDescription" }); // Adjust the query parameter as needed
    

    // Validate the search response
    expect(searchResponse.statusCode).toBe(200);
    const searchData = searchResponse.body;
    expect(searchData.data.length).toBeGreaterThan(0); // Ensure that results are returned
    expect(searchData.data[0].country).toEqual("update country");

  } catch (error) {
    console.error("Test failed with error: ", error);
    throw error;  // Ensure test fails on error
  }
});


test("Test 10 Add like to a trip", async () => {
  try {
    console.log("Add like to a trip");
    const response = await request(app)
      .get("/trips")
      .set("Authorization", "JWT " + accessToken);
    const data = response.body;
    const trip = data[0];

    const res = await request(app)
      .post(`/trips/${trip._id}/likes/`)
      .set("Authorization", "JWT " + accessToken)
      .send({ owner: "David" });

    expect(res.statusCode).toBe(200);
  } catch (error) {
    console.error("Test failed with error: ", error);
    throw error;  // Ensure test fails on error
  }
});
});