import mongoose from "mongoose";

const captionLineSchema = new mongoose.Schema({
  start: { type: Number, required: true }, // seconds
  end:   { type: Number, required: true },
  text:  { type: String, required: true },

  // Filled in by utils/speakerAnalyzer.js. "speaker" is either a real
  // character name the AI picked out of dialogue context ("Sarah") or a
  // generic label ("Speaker 1") when no name is inferable. "gender" drives
  // which ElevenLabs voice pool a speaker draws from (see utils/tts.js).
  speaker: { type: String, default: "Speaker 1" },
  gender:  { type: String, enum: ["male", "female", "unknown"], default: "unknown" },

  // Assigned once per speaker (not per line) so the same character keeps
  // the same voice for the whole video — see utils/tts.js assignVoices().
  voiceId: { type: String, default: null },
}, { _id: false });

const captionSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true, index: true },
  owner: { type: String, required: true },
  language: { type: String, default: null }, // null = original transcript language

  captions: [captionLineSchema],

  // speaker -> voiceId, kept alongside captions so re-translating (which
  // rewrites .text per line) doesn't lose the original voice assignment —
  // dubController.js reads this map, not the per-line voiceId, when
  // building the dub for a translated caption set.
  voiceMap: { type: Map, of: String, default: {} },
}, { timestamps: true });

captionSchema.index({ video: 1, owner: 1, language: 1 }, { unique: true });

export default mongoose.model("Caption", captionSchema);
