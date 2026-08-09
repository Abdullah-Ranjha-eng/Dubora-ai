import Video from "../models/video.js";
import Caption from "../models/caption.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import { ownerFields, isOwner } from "../utils/ownership.js";
import { translateCaptionTexts, SUPPORTED_LANGUAGES } from "../utils/translate.js";

export const getSupportedLanguages = (req, res) => {
  res.status(200).json({ success: true, languages: SUPPORTED_LANGUAGES });
};

// POST /api/v1/videos/:videoId/captions/translate  { language: "Spanish" }
// Translates the ORIGINAL (language: null) caption set's text and stores it
// as a new Caption doc keyed by language. speaker/gender/timing carry over
// unchanged — voiceMap is intentionally left empty here so dubController
// assigns fresh voices the first time this translated set gets dubbed
// (same speaker labels though, so if the original was already dubbed once,
// re-running assignVoices with the carried-over speaker names will still
// tend to reuse the same voice pool assignment logic).
export const translateCaptions = catchAsyncErrors(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new ErrorHandler("Video not found.", 404));
  if (!isOwner(video, req)) return next(new ErrorHandler("Not authorized.", 403));

  const { language } = req.body;
  if (!language) return next(new ErrorHandler("language is required.", 400));

  const original = await Caption.findOne({ video: video._id, ...ownerFields(req), language: null });
  if (!original) return next(new ErrorHandler("Generate captions first.", 404));
  if (original.captions.length === 0) return next(new ErrorHandler("Captions are empty.", 400));

  const translatedTexts = await translateCaptionTexts(original.captions.map((c) => c.text), language);

  const translatedLines = original.captions.map((c, i) => ({
    ...c.toObject(),
    text: translatedTexts[i] || c.text,
  }));

  const captionDoc = await Caption.findOneAndUpdate(
    { video: video._id, ...ownerFields(req), language },
    { captions: translatedLines, voiceMap: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  video.status = "translated";
  await video.save();

  res.status(200).json({ success: true, captions: captionDoc });
});
