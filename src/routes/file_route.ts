import express from "express";
const router = express.Router();
import multer from "multer";

/**
 * @swagger
 * tags:
 *   name: File
 *   description: API endpoints for file upload
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUpload:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: The URL of the uploaded file
 *       example:
 *         url: "https://localhost:3000/public/example.jpg"
 */

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload a file
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: The URL of the uploaded file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUpload'
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname
      .split(".")
      .filter(Boolean) // removes empty extensions (e.g. filename...txt)
      .slice(1)
      .join(".");
    cb(null, Date.now() + "." + ext);
  },
});
const upload = multer({ storage: storage });

router.post("/", upload.single("file"), function (req, res) {
  const base = "http://localhost:" + process.env.port + "/";
  console.log("router.post(/file: " + base + req.file.path);
  res.status(200).send({ url: base + req.file.path });
});

export = router;
