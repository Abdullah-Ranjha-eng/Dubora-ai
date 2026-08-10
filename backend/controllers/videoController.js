import cloudinary from "cloudinary";
import Video from "../models/video.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";

// GET /api/v1/videos/upload-signature
//
// Vercel serverless functions cap request bodies at ~4.5MB — sending a real
// video file THROUGH the API (the old multer-based flow) works locally but
// fails outright on Vercel for any file bigger than that, silently or with
// a 413. The fix is uploading directly from the BROWSER to Cloudinary,
// bypassing our API for the actual file bytes entirely; this endpoint just
// hands the browser a short-lived signature so it can do that without ever
// exposing CLOUDINARY_API_SECRET client-side. See frontend/src/stores/video.js
// startUpload() for the browser side of this.
export const getUploadSignature = catchAsyncErrors(async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: "dubverse/originals" };

  const signature = cloudinary.v2.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  res.status(200).json({
    success: true,
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: paramsToSign.folder,
  });
});

// POST /api/v1/videos — JSON body, NOT multipart. The browser has already
// uploaded the file directly to Cloudinary (using the signature above) by
// the time this is called; this just records the result. `duration` comes
// straight from Cloudinary's own upload response (it returns video
// duration automatically) — no ffmpeg/probing needed here.
export const uploadVideo = catchAsyncErrors(async (req, res, next) => {
  const { public_id, url, duration, title } = req.body;
  if (!public_id || !url) return next(new ErrorHandler("Missing Cloudinary upload result.", 400));

  const video = await Video.create({
    ...ownerFields(req),
    title: title || "Untitled video",
    duration: typeof duration === "number" ? duration : null,
    originalVideo: { public_id, url },
    status: "uploaded",
  });

  res.status(201).json({ success: true, video });
});

export const getVideo = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));
  res.status(200).json({ success: true, video });
});

export const listVideos = catchAsyncErrors(async (req, res) => {
  const videos = await Video.find(ownerFields(req)).sort({ createdAt: -1 });
  res.status(200).json({ success: true, videos });
});

export const deleteVideo = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  for (const asset of [video.originalVideo, video.dubbedVideo]) {
    if (asset?.public_id) {
      cloudinary.v2.uploader.destroy(asset.public_id, { resource_type: "video" }).catch(() => {});
    }
  }
  await video.deleteOne();

  res.status(200).json({ success: true, message: "Video deleted." });
});
