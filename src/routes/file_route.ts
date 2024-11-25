import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary"; //
import { deleteImageFromCloudinary } from "../controllers/fileController";
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CustomParams {
  folder?: string;
  format?: (req: Express.Request, file: Express.Multer.File) => string;
  public_id?: (req: Express.Request, file: Express.Multer.File) => string;
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "your-folder-name",
    format: (req, file) => "webp",
    public_id: (req, file) => "file-${Date.now()}",
  } as CustomParams,
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  res.status(200).json({
    url: req.file.path,
  });
});

router.delete("/delete-image", deleteImageFromCloudinary);

export default router;
