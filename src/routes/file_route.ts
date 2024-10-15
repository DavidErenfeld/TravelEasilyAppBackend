import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary"; // Cloudinary v2

const router = express.Router();

// הגדרת Cloudinary עם משתני סביבה
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// הרחבת ה-`Params` כדי לתמוך ב-folder
interface CustomParams {
  folder?: string;
  format?: (req: Express.Request, file: Express.Multer.File) => string; // פונקציה מחזירה string, לא Promise
  public_id?: (req: Express.Request, file: Express.Multer.File) => string;
}

// הגדרת אחסון עבור Multer עם תמיכה בתיקיות ב-Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "your-folder-name", // שם התיקייה לשמירת הקבצים ב-Cloudinary
    format: (req, file) => "png", // פורמט של הקובץ (png, jpg וכו')
    public_id: (req, file) => "custom-filename",
  } as CustomParams, // הוספת הטיפוס מותאם אישית עבור folder ו-public_id
});

// הגדרת Multer לשימוש באחסון שהוגדר עם Cloudinary
const upload = multer({ storage });

// נתיב להעלאת תמונות
router.post("/upload", upload.single("file"), (req, res) => {
  // מוודאים שקובץ קיים בבקשה
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // שליחה חזרה של כתובת התמונה שהועלתה
  res.status(200).json({
    url: req.file.path, // הכתובת ב-Cloudinary
  });
});

export default router;
