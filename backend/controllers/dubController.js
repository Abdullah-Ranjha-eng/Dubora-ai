import Video from "../models/video.js";
import Caption from "../models/caption.js";
import DubJob from "../models/dubJob.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";

// POST /api/v1/videos/:videoId/dub  { language: null | "Spanish" }
//
// Queues a DubJob and returns immediately (202) instead of running the dub
// inline — see models/dubJob.js for why. The frontend polls getDubStatus
// below until status is "done" or "failed".
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

  // Don't queue a second job if one's already in flight for this exact
  // video+language — return the existing one instead so repeated clicks
  // don't pile up duplicate dubs.
  const existing = await DubJob.findOne({
    video: video._id,
    language: language || null,
    status: { $in: ["pending", "processing"] },
  });
  if (existing) {
    return res.status(202).json({
      success: true,
      message: "A dub is already in progress for this video/language.",
      jobId: existing._id,
      status: existing.status,
    });
  }

  const job = await DubJob.create({
    video: video._id,
    caption: captionDoc._id,
    language: language || null,
    status: "pending",
  });

  res.status(202).json({
    success: true,
    message: "Dub queued. Poll GET /dub-status for progress.",
    jobId: job._id,
    status: job.status,
  });
});

// GET /api/v1/videos/:videoId/dub-status?language=Spanish
// Poll this until status is "done" or "failed".
export const getDubStatus = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { language } = req.query;

  const job = await DubJob.findOne({
    video: video._id,
    language: language || null,
  }).sort({ createdAt: -1 });

  if (!job) return next(new ErrorHandler("No dub job found for this video/language.", 404));

  res.status(200).json({
    success: true,
    jobId: job._id,
    status: job.status,
    error: job.error,
    dubbedVideo: job.status === "done" ? job.dubbedVideo : undefined,
  });
});
