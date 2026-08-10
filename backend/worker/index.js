// Standalone worker process. Deploy this to a host that runs a persistent
// process — Railway, Render, Fly.io, or any small VM. It does NOT run on
// Vercel: Vercel only runs serverless functions per-request, with no
// concept of a background process that outlives a single request, which
// is exactly why dubbing can't run inline in the API anymore (see
// models/dubJob.js and controllers/dubController.js).
//
// Needs the same env vars as the API: DB_URI (or DB_LOCAL_URI),
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
// GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_MALE_VOICE_IDS,
// ELEVENLABS_FEMALE_VOICE_IDS.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../config/config.env") });

import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { connectDatabase } from "../config/dbConnect.js";
import DubJob from "../models/dubJob.js";
import Video from "../models/video.js";
import Caption from "../models/caption.js";
import { runDub } from "../utils/dubEngine.js";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000;

// Atomically claims the oldest pending job so two worker instances (if you
// ever scale to more than one) can't both grab the same job.
async function claimNextJob() {
  return DubJob.findOneAndUpdate(
    { status: "pending" },
    { status: "processing", startedAt: new Date() },
    { sort: { createdAt: 1 }, new: true }
  );
}

async function processJob(job) {
  console.log(`[worker] processing dub job ${job._id} (video ${job.video})`);
  try {
    const video = await Video.findById(job.video);
    if (!video) throw new Error("Video no longer exists.");

    const captionDoc = await Caption.findById(job.caption);
    if (!captionDoc) throw new Error("Caption document no longer exists.");
    if (!captionDoc.captions || captionDoc.captions.length === 0)
      throw new Error("Captions are empty.");

    const previousPublicId = video.dubbedVideo?.public_id || null;

    const dubbedVideo = await runDub(video, captionDoc);

    job.status = "done";
    job.dubbedVideo = dubbedVideo;
    job.finishedAt = new Date();
    await job.save();

    video.dubbedVideo = { ...dubbedVideo, language: job.language };
    video.status = "dubbed";
    await video.save();

    if (previousPublicId) {
      cloudinary.v2.uploader.destroy(previousPublicId, { resource_type: "video" }).catch(() => {});
    }

    console.log(`[worker] dub job ${job._id} done`);
  } catch (err) {
    console.error(`[worker] dub job ${job._id} failed:`, err);
    job.status = "failed";
    job.error = err.message || String(err);
    job.finishedAt = new Date();
    await job.save();
  }
}

async function loop() {
  console.log("[worker] polling for dub jobs...");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        continue; // check for another job immediately
      }
    } catch (err) {
      console.error("[worker] loop error:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function main() {
  try {
    await connectDatabase();
  } catch (err) {
    console.error("[worker] could not connect to MongoDB, retrying in 5s...", err.message);
    setTimeout(main, 5000);
    return;
  }
  await loop();
}

process.on("uncaughtException", (err) => console.error("[worker] uncaughtException:", err));
process.on("unhandledRejection", (err) => console.error("[worker] unhandledRejection:", err));

main();
