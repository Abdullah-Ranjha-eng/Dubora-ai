import fs from "fs";
import cloudinary from "cloudinary";
import Video from "../models/video.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";
import { localPathFor, VIDEOS_DIR, safeUnlink } from "../utils/localStorage.js";
import { probeDurationSeconds } from "../utils/dubEngine.js";

// POST /api/v1/videos — multipart upload (field name: "video")
export const uploadVideo = catchAsyncErrors(async (req, res, next) => {
  if (!req.file) return next(new ErrorHandler("No video file uploaded.", 400));

  const duration = await probeDurationSeconds(req.file.path);

  const uploadResult = await cloudinary.v2.uploader.upload(req.file.path, {
    resource_type: "video",
    folder: "dubverse/originals",
    chunk_size: 6000000,
    timeout: 180000,
  });

  // Keep the local copy under uploads/videos/ (renamed to its Cloudinary
  // public_id-ish name) instead of deleting it — every later step
  // (transcription, dubbing) reuses this local file instead of
  // re-downloading from Cloudinary. See utils/dubEngine.js getLocalOriginalPath.
  const localFilename = `${uploadResult.public_id.split("/").pop()}${req.file.originalname.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".mp4"}`;
  fs.renameSync(req.file.path, localPathFor(VIDEOS_DIR, localFilename));

  const video = await Video.create({
    ...ownerFields(req),
    title: req.body.title || req.file.originalname,
    duration,
    originalVideo: { public_id: uploadResult.public_id, url: uploadResult.secure_url },
    localFilename,
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

  if (video.localFilename) safeUnlink(localPathFor(VIDEOS_DIR, video.localFilename));
  for (const asset of [video.originalVideo, video.dubbedVideo]) {
    if (asset?.public_id) {
      cloudinary.v2.uploader.destroy(asset.public_id, { resource_type: "video" }).catch(() => {});
    }
  }
  await video.deleteOne();

  res.status(200).json({ success: true, message: "Video deleted." });
});
