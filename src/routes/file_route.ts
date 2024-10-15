import express from "express";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const router = express.Router();

// הגדרת Cloudinary עם משתני סביבה
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// הגדרת Multer עם Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // התיקיה שבה יאוחסנו התמונות ב-Cloudinary
    format: async (req, file) => file.mimetype.split("/")[1], // שומר את הפורמט המקורי של הקובץ
    public_id: (req, file) => file.originalname.split(".")[0], // שם הקובץ ללא הסיומת
  },
});

const upload = multer({ storage });

// נקודת הקצה להעלאת קבצים
router.post("/", upload.single("file"), function (req, res) {
  if (req.file && req.file.path) {
    console.log("Uploaded file URL: ", req.file.path);
    res.status(200).send({ url: req.file.path });
  } else {
    res.status(400).send("Error uploading file.");
  }
});

export = router;
