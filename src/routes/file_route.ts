import express from "express";
const router = express.Router();
import multer from "multer";

const base = "https://evening-bayou-77034-176dc93fb1e1.herokuapp.com";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop();
    const date = new Date();
    const formattedDate = date
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+$/, "");
    cb(null, formattedDate + "." + ext);
  },
});

// Initialize multer with the configured storage
const upload = multer({ storage: storage });

/**
 * @swagger
 * /file/:
 *   post:
 *     summary: Upload a file
 *     tags: [File]
 *     description: Uploads a file to the server and returns its URL.
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload.
 *     responses:
 *       '200':
 *         description: File successfully uploaded.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL of the uploaded file.
 *                   example: http://localhost:3000/public/uploads/file-12345.png
 *       '400':
 *         description: Bad request - Error during the file upload process.
 *       '500':
 *         description: Internal server error - Something went wrong on the server.
 */
router.post("/", upload.single("file"), function (req, res) {
  const filePath = req.file.path.replace(/\\/g, "/");
  console.log("router.post(/file: " + base + "/" + filePath);
  res.status(200).send({ url: base + "/" + filePath });
});

export = router;
