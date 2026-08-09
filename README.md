# DubVerse AI

AI video dubbing: upload a video → AI transcribes it and labels each line
with a speaker/character name and gender → translate into other languages →
edit captions → click **AI Dub** to generate a new audio track with a
distinct AI voice per speaker and mux it back onto the video.

## Stack
- **Backend:** Node/Express, MongoDB, Groq (Whisper transcription + LLaMA
  for speaker ID and translation), ElevenLabs (TTS), Cloudinary (storage),
  ffmpeg (audio mixing + muxing).
- **Frontend:** Vue 3 + Vite.

## Local setup

### 1. Backend
```bash
cd backend
npm install
cp config/config.env.example config/config.env
# then fill in config/config.env:
#   - a MongoDB URI (local mongod, or a free Atlas cluster)
#   - GROQ_API_KEY        (console.groq.com — free tier available)
#   - ELEVENLABS_API_KEY  (elevenlabs.io)
#   - CLOUDINARY_*        (cloudinary.com — free tier available)
npm run dev
```
Runs on `http://localhost:5000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api` to the backend (see
`vite.config.js`).

## How dubbing works (utils/dubEngine.js)
1. Each caption line is synthesized individually with ElevenLabs, using a
   voice assigned per **speaker** (not per line) — so the same character
   keeps the same voice for the whole video. Voices are drawn from separate
   male/female pools (`ELEVENLABS_MALE_VOICE_IDS` / `ELEVENLABS_FEMALE_VOICE_IDS`
   in `config.env`) and round-robin assigned, so e.g. 2 male + 2 female
   speakers get 4 distinct voices.
2. Each synthesized clip is time-fit to its caption's on-screen duration
   with ffmpeg's `atempo` filter (clamped to 0.5×–2.0×) and delayed to its
   start time with `adelay`.
3. All clips are mixed into one audio track (`amix`), padded/trimmed to the
   original video's exact duration, and muxed onto the original video
   (video stream copied, not re-encoded — only audio is regenerated).

## ⚠️ Before deploying to Vercel
Both caption generation and dubbing do real, potentially slow work
(transcription, N sequential TTS calls, an ffmpeg encode) — currently they
run **inline** in the request handler, which only works because there's no
execution-time limit locally. Vercel serverless functions do have one
(10-60s on Hobby). Don't deploy `dubController.js` as-is; convert it to the
same **queue + background worker** pattern used in the captioning project
(a `DubJob` model, `dubVideo` just creates a job and returns `202`, and a
separate always-on process on Railway/Render/Fly polls for pending jobs and
calls `runDub()`). `utils/dubEngine.js` is already written to be called
from either place unchanged.
