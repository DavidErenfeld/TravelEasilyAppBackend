import { Request, Response } from "express";
import { IUser, User } from "../entity/users_model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import connectDB from "../data-source";
import { access } from "fs";

const client = new OAuth2Client();
const UserRepository = connectDB.getRepository(User);

const googleSignin = async (req: Request, res: Response) => {
  console.log(req.body);
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return res.status(400).send("Email not provided by Google.");
    }

    let user = await UserRepository.findOneBy({ email });

    if (!user) {
      // ודא שכל השדות הנדרשים קיימים
      const userName = payload?.name || "DefaultUserName"; // שם משתמש ברירת מחדל אם חסר
      user = UserRepository.create({
        email,
        password: "0", // סיסמא ריקה או ערך דיפולטיבי כלשהו
        imgUrl: payload?.picture,
        userName, // חשוב להוסיף את השדה הזה
      });

      await UserRepository.save(user); // שמירה של המשתמש בבסיס הנתונים
    }

    const tokens = await generateTokens(user);

    res.status(200).send({
      userName: user.userName,
      email: user.email,
      _id: user._id,
      imgUrl: user.imgUrl,
      ...tokens,
    });
  } catch (err) {
    console.error("Error in Google Sign-In:", err.message);
    return res.status(400).send(err.message);
  }
};

const register = async (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;
  const imgUrl = req.body.imgUrl;
  const userName = req.body.userName;
  if (!email || !password) {
    return res.status(400).send("missing email or password");
  }
  try {
    const rs = await UserRepository.findOneBy({ email: email });
    if (rs != null) {
      return res.status(406).send("email already exists");
    }
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const rs2 = await UserRepository.create({
      email: email,
      password: encryptedPassword,
      imgUrl: imgUrl,
      userName: userName,
    });
    const tokens = await generateTokens(rs2);
    console.log(rs2);
    res.status(201).send({
      userName: rs2.userName,
      email: rs2.email,
      _id: rs2._id,
      imgUrl: rs2.imgUrl,
      ...tokens,
    });
  } catch (err) {
    return res.status(400).send("error missing email or password");
  }
};

const generateTokens = async (user: IUser) => {
  const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET
  );
  if (user.refreshTokens == null) {
    user.refreshTokens = [refreshToken];
  } else {
    user.refreshTokens.push(refreshToken);
  }
  await UserRepository.save(user);

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};

const verifyPassword = async (req: Request, res: Response) => {
  const { id } = req.params; // Using "id" because that's what you're passing in the request
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Missing Parameters" });
  }
  const { currentPassword } = req.body;
  try {
    // Fetch the user from the database by their email address
    const user = await UserRepository.findOneBy({ _id: id }); // Using "id" as the email since it's passed in as the parameter

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the provided current password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    // Respond with whether the password is valid or not
    res.json({ isValid: passwordMatch });
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req: Request, res: Response) => {
  // const _id = req.body._id;
  const password = req.body.password;
  const email = req.body.email;
  if (!email || !password) {
    return res.status(400).send("missing email or password");
  }
  try {
    const user = await UserRepository.findOneBy({ email: email });
    if (user == null) {
      return res.status(401).send("email or password incorrect");
    }
    const match = await bcrypt.compare(password, user.password);
    console.log(match);
    if (!match) {
      console.log(password);
      return res.status(401).send("email or password incorrect");
    }

    const tokens = await generateTokens(user);
    console.log(user);
    return res.status(200).send({
      userName: user.userName,
      email: user.email,
      _id: user._id,
      imgUrl: user.imgUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    return res.status(400).send("error missing email or password");
  }
};

// =
const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (refreshToken == null) return res.sendStatus(401);
  jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
    async (err, user: { _id: string }) => {
      console.log(err);
      if (err) return res.sendStatus(401);
      try {
        const userDb = await UserRepository.findOneBy({ _id: user._id });
        if (
          !userDb.refreshTokens ||
          !userDb.refreshTokens.includes(refreshToken)
        ) {
          userDb.refreshTokens = [];
          await UserRepository.save(userDb);
          return res.sendStatus(401);
        } else {
          userDb.refreshTokens = userDb.refreshTokens.filter(
            (t) => t !== refreshToken
          );
          await UserRepository.save(userDb);

          return res.sendStatus(200);
        }
      } catch (err) {
        res.sendStatus(401).send(err.message);
      }
    }
  );
};

const refresh = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (refreshToken == null) return res.sendStatus(401);
  jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
    async (err, user: { _id: string }) => {
      if (err) {
        console.log(err);
        return res.sendStatus(401);
      }
      try {
        const userDb = await UserRepository.findOneBy({ _id: user._id });
        if (
          !userDb.refreshTokens ||
          !userDb.refreshTokens.includes(refreshToken)
        ) {
          userDb.refreshTokens = [];
          await UserRepository.save(userDb);
          return res.sendStatus(401);
        }
        const accessToken = jwt.sign(
          { _id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRATION }
        );
        const newRefreshToken = jwt.sign(
          { _id: user._id },
          process.env.JWT_REFRESH_SECRET
        );
        userDb.refreshTokens = userDb.refreshTokens.filter(
          (t) => t !== refreshToken
        );
        userDb.refreshTokens.push(newRefreshToken);
        await UserRepository.save(userDb);
        return res.status(200).send({
          accessToken: accessToken,
          refreshToken: newRefreshToken,
        });
      } catch (err) {
        res.status(401).send(err.message);
      }
    }
  );
};
export default {
  googleSignin,
  register,
  login,
  logout,
  refresh,
  verifyPassword,
};
