import fs from "fs";
import Groq from "groq-sdk";

// Lazy client: constructed on first use, not at module load time —
// module-top-level construction bit us once already (see server.js
// for the full story on the ESM import-ordering bug this avoids).
//
// timeout: without this, groq-sdk uses a very long default and a hung
// request (bad network path, provider-side stall) just sits pending
// forever with zero feedback — which is exactly what makes the frontend
// button look "stuck disabled" for good, since its busy flag never
// resets. 120s is generous for transcribing a single video; tune down if
// you want faster failure on short clips.
let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 120_000, maxRetries: 1 });
  return groq;
}

// Transcribes an audio/video file and returns segment-level timestamps:
// [{ start, end, text }]. Groq's whisper-large-v3 endpoint accepts video
// containers directly (it extracts audio server-side), so we don't need to
// run ffmpeg to pull an audio track out first.
export async function transcribeAudioFile(filePath) {
  const transcription = await getGroq().audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-large-v3",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return (transcription.segments || []).map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  })).filter((seg) => seg.text.length > 0);
}