import mongoose from "mongoose";

const cloudAssetSchema = new mongoose.Schema({
  public_id: String,
  url: String,
}, { _id: false });

const videoSchema = new mongoose.Schema({
  owner:      { type: String, required: true }, // user id or guest id — see utils/ownership.js
  title:      { type: String, required: true },
  duration:   { type: Number, default: null },  // seconds
  originalVideo: cloudAssetSchema,
  localFilename: { type: String, default: null }, // filename on disk under uploads/, for reuse without re-downloading

  // "uploaded" -> "transcribed" -> "translated" (optional) -> "dubbed"
  status: { type: String, default: "uploaded" },

  dubbedVideo: {
    public_id: String,
    url: String,
    language: String, // null/"" = dubbed in original language with AI voices
  },
}, { timestamps: true });

export default mongoose.model("Video", videoSchema);
