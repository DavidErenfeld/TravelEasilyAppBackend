import { Request, Response } from "express";
import { IUser, User } from "../entity/users_model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import connectDB from "../data-source";

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
      const userName = payload?.name || "DefaultUserName";
      user = UserRepository.create({
        email,
        password: "0",
        imgUrl: payload?.picture,
        userName,
      });

      await UserRepository.save(user);
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

  console.log("Register request received:", {
    email,
    password,
    imgUrl,
    userName,
  });

  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).send("missing email or password");
  }

  try {
    const rs = await UserRepository.findOneBy({ email: email });
    if (rs != null) {
      console.log("Email already exists:", email);
      return res.status(406).send("email already exists");
    }

    console.log("Creating new user:", { email, imgUrl, userName });
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const newUser = UserRepository.create({
      email: email,
      password: encryptedPassword,
      imgUrl: imgUrl,
      userName: userName,
    });

    console.log("Saving new user to database");
    await UserRepository.save(newUser);

    console.log("Generating tokens for new user");
    const tokens = await generateTokens(newUser);

    console.log("User registered successfully:", {
      userName: newUser.userName,
      email: newUser.email,
    });
    res.status(201).send({
      userName: newUser.userName,
      email: newUser.email,
      _id: newUser._id,
      imgUrl: newUser.imgUrl,
      ...tokens,
    });
  } catch (err) {
    console.error("Error during user registration:", err.message);
    return res.status(400).send("error missing email or password");
  }
};

const generateTokens = async (user: IUser) => {
  const jwtExpiration = process.env.JWT_EXPIRATION || "2m"; // ערך ברירת מחדל במקרה שאין משתנה סביבה מוגדר
  const accessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h", // להשתמש בערך מוגדר או ברירת מחדל
  });

  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET
  );

  if (!user.refreshTokens) {
    user.refreshTokens = [refreshToken];
  } else {
    user.refreshTokens.push(refreshToken);
  }

  await UserRepository.save(user);

  return {
    accessToken,
    refreshToken,
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
  console.log("Login request received:", req.body.email, req.body.password);

  const password = req.body.password;
  const email = req.body.email;

  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).send("Missing email or password");
  }

  try {
    const user = await UserRepository.findOneBy({ email: email });

    if (user == null) {
      console.log("User not found:", email);
      return res.status(401).send("Email or password incorrect");
    }

    const match = await bcrypt.compare(password, user.password);
    console.log("Password match result:", match);

    if (!match) {
      console.log("Password mismatch:", password);
      return res.status(401).send("Email or password incorrect");
    }

    const tokens = await generateTokens(user);
    console.log("Login successful, generating tokens for:", user.email);

    return res.status(200).send({
      userName: user.userName,
      email: user.email,
      _id: user._id,
      imgUrl: user.imgUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    return res.status(400).send("Error during login");
  }
};

const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!refreshToken) {
    console.log("Missing refresh token");
    return res.sendStatus(401);
  }

  try {
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decodedUser: { _id: string }) => {
        if (err) {
          console.error("Invalid refresh token:", err);
          return res.status(403).send("Invalid token");
        }

        try {
          const userDb = await UserRepository.findOneBy({
            _id: decodedUser._id,
          });

          if (!userDb) {
            console.log("User not found for logout");
            return res.status(404).send("User not found");
          }

          if (
            !userDb.refreshTokens ||
            !userDb.refreshTokens.includes(refreshToken)
          ) {
            console.log("Token not found for user, clearing all tokens");
            userDb.refreshTokens = []; // מחיקת כל ה-tokens במקרה של חוסר התאמה
            await UserRepository.save(userDb);
            return res.status(401).send("Token not found");
          }

          // סינון ה-refresh token הנוכחי מהרשימה של המשתמש
          userDb.refreshTokens = userDb.refreshTokens.filter(
            (t) => t !== refreshToken
          );

          await UserRepository.save(userDb);
          console.log("Token removed successfully for user:", userDb._id);
          return res.sendStatus(200);
        } catch (err) {
          console.error("Error finding or updating user:", err.message);
          return res.status(500).send("Internal server error");
        }
      }
    );
  } catch (err) {
    console.error("Unexpected error in logout:", err.message);
    return res.status(500).send("Unexpected error");
  }
};

const refresh = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!refreshToken) {
    console.log("Missing refresh token");
    return res.sendStatus(401);
  }

  console.log("Received refresh token:", refreshToken);

  try {
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decodedUser: { _id: string }) => {
        if (err) {
          console.error("Invalid refresh token:", err);
          return res.status(403).send("Invalid refresh token");
        }

        try {
          const userDb = await UserRepository.findOneBy({
            _id: decodedUser._id,
          });

          if (!userDb) {
            console.log("User not found for refresh token:", decodedUser._id);
            return res.status(404).send("User not found");
          }

          // בדיקה אם ה-refresh token קיים אצל המשתמש
          if (
            !userDb.refreshTokens ||
            !userDb.refreshTokens.includes(refreshToken)
          ) {
            console.log("Refresh token not found for user:", decodedUser._id);
            userDb.refreshTokens = []; // ניקוי כל ה-tokens במקרה של חוסר התאמה
            await UserRepository.save(userDb);
            return res.status(403).send("Invalid refresh token");
          }

          // יצירת access token חדש
          const accessToken = jwt.sign(
            { _id: userDb._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || "1h" }
          );

          // יצירת refresh token חדש
          const newRefreshToken = jwt.sign(
            { _id: userDb._id },
            process.env.JWT_REFRESH_SECRET
          );

          // מחיקת ה-refresh token הישן והוספת החדש
          userDb.refreshTokens = userDb.refreshTokens.filter(
            (t) => t !== refreshToken
          );
          userDb.refreshTokens.push(newRefreshToken);

          console.log(
            "Generated new access and refresh tokens for user:",
            userDb._id
          );

          await UserRepository.save(userDb);

          // שליחת ה-access וה-refresh החדשים למשתמש
          return res.status(200).send({
            accessToken: accessToken,
            refreshToken: newRefreshToken,
          });
        } catch (err) {
          console.error("Error during token refresh for user:", err.message);
          return res.status(500).send("Failed to refresh token");
        }
      }
    );
  } catch (err) {
    console.error("Unexpected error in refresh function:", err.message);
    return res.status(500).send("Unexpected error");
  }
};

export default {
  googleSignin,
  register,
  login,
  logout,
  refresh,
  verifyPassword,
};
