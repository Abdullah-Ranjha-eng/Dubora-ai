// This is the dubbing equivalent of the caption-burn pipeline from the
// captioning project: same lesson applies here — this does real work
// (N TTS API calls + an ffmpeg mix + an encode) that will NOT fit inside a
// Vercel serverless function's time limit for anything but a very short
// video. Locally (this file's current use) that's not a problem. Before
// deploying to Vercel, wrap this the same way burning was: an API endpoint
// that only queues a job, plus a separate always-on worker process that
// calls runDub(). Don't call runDub() directly from a Vercel function.
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { spawn } from "child_process";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import cloudinary from "cloudinary";
import { safeUnlink, localPathFor, VIDEOS_DIR } from "./localStorage.js";
import { assignVoices, synthesizeSpeech } from "./tts.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function probeDurationSeconds(filePath) {
  return new Promise((resolve) => {
    let stderr = "";
    const proc = spawn(ffmpegPath, ["-i", filePath, "-hide_banner"]);
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return resolve(null);
      const [, hh, mm, ss] = match;
      resolve(Number(hh) * 3600 + Number(mm) * 60 + Number(ss));
    });
  });
}

const downloadVideo = async (url, destPath) => {
  const response = await axios({ url, responseType: "stream" });
  await pipeline(response.data, createWriteStream(destPath));
};

export const getLocalOriginalPath = async (video) => {
  const localFile = video.localFilename ? localPathFor(VIDEOS_DIR, video.localFilename) : null;
  if (localFile && fs.existsSync(localFile)) return { filePath: localFile, isTemp: false };

  const tmpVideo = path.join(os.tmpdir(), `${video._id}_${Date.now()}.mp4`);
  await downloadVideo(video.originalVideo.url, tmpVideo);
  return { filePath: tmpVideo, isTemp: true };
};

// ffmpeg's atempo filter only accepts 0.5-2.0 in a single instance (chaining
// multiple atempo filters covers a wider range, e.g. atempo=2,atempo=2 for
// 4x — not implemented here since dubbed dialogue needing >2x/< 0.5x
// speed-up to fit its slot indicates a translation that's fundamentally too
// long/short for the timing, not something audio speed can reasonably fix
// without sounding broken). Values are clamped so ffmpeg never rejects the
// filter outright; extreme clamps will sound off but won't crash the job.
const clampAtempo = (factor) => Math.min(2.0, Math.max(0.5, factor));

// Runs the full dub for one (video, captionDoc) pair and returns the
// resulting Cloudinary asset: { public_id, url }. Throws on any failure.
export async function runDub(video, captionDoc) {
  const tmpDir = os.tmpdir();
  const clipPaths = [];

  try {
    const { filePath: inputPath, isTemp: inputIsTemp } = await getLocalOriginalPath(video);

    try {
      // 1. Assign one voice per distinct speaker (not per line), so the
      //    same character sounds the same throughout — see utils/tts.js.
      const voiceMap = assignVoices(captionDoc.captions, Object.fromEntries(captionDoc.voiceMap || []));
      captionDoc.voiceMap = voiceMap;
      await captionDoc.save();

      // 2. Synthesize each line with its speaker's voice, and probe how
      //    long each clip actually came out (TTS output length rarely
      //    matches the original line's on-screen duration).
      const clips = [];
      for (const [i, line] of captionDoc.captions.entries()) {
        const voiceId = voiceMap[line.speaker];
        if (!voiceId) throw new Error(`No voice assigned for speaker "${line.speaker}".`);

        const audioBuffer = await synthesizeSpeech(line.text, voiceId);
        const clipPath = path.join(tmpDir, `${video._id}_line${i}_${randomUUID()}.mp3`);
        fs.writeFileSync(clipPath, audioBuffer);
        clipPaths.push(clipPath);

        const clipDuration = await probeDurationSeconds(clipPath);
        const segmentDuration = Math.max(0.1, line.end - line.start);
        const atempo = clipDuration ? clampAtempo(clipDuration / segmentDuration) : 1;

        clips.push({ path: clipPath, startMs: Math.round(line.start * 1000), atempo });
      }

      if (clips.length === 0) throw new Error("No caption lines to dub.");

      // 3. Build one ffmpeg invocation: input 0 is the original video,
      //    inputs 1..N are the TTS clips. Each clip gets time-fit to its
      //    slot (atempo) and pushed to its start time (adelay), then all
      //    clips are mixed into a single audio track and padded/trimmed to
      //    exactly the original video's duration so the mux below can't
      //    drift or get cut short.
      const videoDuration = video.duration || await probeDurationSeconds(inputPath) || 0;

      const filterParts = clips.map((clip, idx) => {
        const inputIndex = idx + 1; // 0 is the video
        return `[${inputIndex}:a]atempo=${clip.atempo.toFixed(3)},adelay=${clip.startMs}:all=1[a${idx}]`;
      });
      const mixInputs = clips.map((_, idx) => `[a${idx}]`).join("");
      const filterComplex =
        `${filterParts.join(";")};${mixInputs}amix=inputs=${clips.length}:duration=longest:dropout_transition=0,apad[aout]`;

      const outputPath = path.join(tmpDir, `${video._id}_dub_${randomUUID()}.mp4`);

      await new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath);
        clips.forEach((clip) => command.input(clip.path));

        command
          .complexFilter(filterComplex)
          .outputOptions(
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-t", String(videoDuration),
          )
          .output(outputPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      // 4. Upload to Cloudinary.
      let uploadResult;
      try {
        uploadResult = await cloudinary.v2.uploader.upload(outputPath, {
          resource_type: "video",
          folder: "dubverse/dubbed",
          chunk_size: 6000000,
          timeout: 180000,
        });
      } finally {
        safeUnlink(outputPath);
      }

      if (inputIsTemp) safeUnlink(inputPath);
      clipPaths.forEach(safeUnlink);

      return { public_id: uploadResult.public_id, url: uploadResult.secure_url };
    } catch (err) {
      if (inputIsTemp) safeUnlink(inputPath);
      throw err;
    }
  } finally {
    clipPaths.forEach(safeUnlink);
  }
}
