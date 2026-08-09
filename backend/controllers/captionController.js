import Video from "../models/video.js";
import Caption from "../models/caption.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";
import { transcribeAudioFile } from "../utils/whisper.js";
import { analyzeSpeakers } from "../utils/speakerAnalyzer.js";
import { getLocalOriginalPath } from "../utils/dubEngine.js";
import { safeUnlink } from "../utils/localStorage.js";

// POST /api/v1/videos/:videoId/captions/generate
// Transcribes the video, then runs speaker/character analysis over the
// transcript so each line is labeled with a speaker name and gender before
// it's ever shown to the user or sent to TTS.
export const generateCaptions = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  console.log(`[generateCaptions] ${video._id}: starting transcription…`);
  const { filePath, isTemp } = await getLocalOriginalPath(video);
  let segments;
  try {
    segments = await transcribeAudioFile(filePath);
  } finally {
    if (isTemp) safeUnlink(filePath);
  }
  console.log(`[generateCaptions] ${video._id}: transcription done, ${segments.length} segments — starting speaker analysis…`);

  if (segments.length === 0)
    return next(new ErrorHandler("No speech detected in this video.", 400));

  const withSpeakers = await analyzeSpeakers(segments);
  console.log(`[generateCaptions] ${video._id}: speaker analysis done — saving…`);

  const captionDoc = await Caption.findOneAndUpdate(
    { video: video._id, ...ownerFields(req), language: null },
    { captions: withSpeakers, voiceMap: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  video.status = "transcribed";
  await video.save();
  console.log(`[generateCaptions] ${video._id}: done.`);

  res.status(200).json({ success: true, captions: captionDoc });
});

export const getVideoCaptions = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { language } = req.query;
  const captionDoc = await Caption.findOne({
    video: video._id,
    ...ownerFields(req),
    language: language || null,
  });
  if (!captionDoc) return next(new ErrorHandler("No captions found for this video/language.", 404));

  res.status(200).json({ success: true, captions: captionDoc });
});

// PUT /api/v1/videos/:videoId/captions — full replace of the caption lines
// (frontend sends the edited array back after the user edits text/speaker
// in the caption editor).
export const updateCaptions = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { captions, language } = req.body;
  if (!Array.isArray(captions)) return next(new ErrorHandler("captions must be an array.", 400));

  const captionDoc = await Caption.findOneAndUpdate(
    { video: video._id, ...ownerFields(req), language: language || null },
    { captions },
    { new: true }
  );
  if (!captionDoc) return next(new ErrorHandler("No captions found for this video/language.", 404));

  res.status(200).json({ success: true, captions: captionDoc });
});

export const deleteCaptions = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { language } = req.query;
  await Caption.deleteOne({ video: video._id, ...ownerFields(req), language: language || null });

  res.status(200).json({ success: true, message: "Captions deleted." });
});