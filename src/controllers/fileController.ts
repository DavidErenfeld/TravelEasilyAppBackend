import { Request, Response } from "express";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const deleteImageFromCloudinary = async (
  req: Request,
  res: Response
) => {
  const { publicId } = req.body;

  try {
    const result = await cloudinary.v2.uploader.destroy(publicId);
    if (result.result !== "ok") {
      return res.status(400).send("Failed to delete image");
    }
    res.status(200).send({ message: "Image deleted successfully", publicId });
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    res.status(500).send("Failed to delete image");
  }
};
