import cloudinary from "cloudinary";
import Video from "../models/video.js";
import Caption from "../models/caption.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";
import { runDub } from "../utils/dubEngine.js";

// POST /api/v1/videos/:videoId/dub  { language: null | "Spanish" }
//
// Runs INLINE (awaits the full dub before responding) — fine for local dev
// where nothing kills a long-running request. This is the exact pattern
// that broke caption burning on Vercel once videos got long: N sequential
// TTS calls plus an ffmpeg encode very easily exceeds a serverless
// function's execution ceiling. Before deploying this to Vercel, replace
// this handler with one that creates a "DubJob" document and returns 202
// immediately, and move the `await runDub(...)` call into a separate
// always-on worker process that polls for pending jobs — see the burn
// pipeline in the captioning project for the exact pattern to copy
// (BurnJob model + worker/index.js).
export const dubVideo = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { language } = req.body;
  const captionDoc = await Caption.findOne({
    video: video._id,
    ...ownerFields(req),
    language: language || null,
  });
  if (!captionDoc) return next(new ErrorHandler("No captions found. Generate (and translate, if needed) captions first.", 404));
  if (captionDoc.captions.length === 0) return next(new ErrorHandler("Captions are empty.", 400));

  const previousPublicId = video.dubbedVideo?.public_id || null;

  const dubbedVideo = await runDub(video, captionDoc);

  video.dubbedVideo = { ...dubbedVideo, language: language || null };
  video.status = "dubbed";
  await video.save();

  res.status(200).json({ success: true, dubbedVideo: video.dubbedVideo });

  if (previousPublicId) {
    cloudinary.v2.uploader.destroy(previousPublicId, { resource_type: "video" }).catch(() => {});
  }
});
