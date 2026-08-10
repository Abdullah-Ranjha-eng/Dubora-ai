import mongoose from "mongoose";

// Dubbing used to run inline in the request (see git history of
// dubController.js) — fine locally, but N sequential TTS calls plus an
// ffmpeg encode/mux will not finish inside a Vercel serverless function's
// time limit for anything but a very short clip. Same lesson as caption
// burning in the Transcripto AI project: the fix is a queue, not a bigger
// timeout. The API only creates one of these and returns immediately;
// worker/index.js (a separate, persistent, non-Vercel process) polls for
// pending ones and does the actual work via utils/dubEngine.js.
const dubJobSchema = new mongoose.Schema({
  video:    { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true, index: true },
  caption:  { type: mongoose.Schema.Types.ObjectId, ref: "Caption", required: true },
  language: { type: String, default: null }, // matches Caption.language at the time this was queued
  status: {
    type: String,
    enum: ["pending", "processing", "done", "failed"],
    default: "pending",
    index: true,
  },
  error: { type: String, default: null },
  dubbedVideo: {
    public_id: String,
    url: String,
  },
  startedAt: Date,
  finishedAt: Date,
}, { timestamps: true });

export default mongoose.model("DubJob", dubJobSchema);
