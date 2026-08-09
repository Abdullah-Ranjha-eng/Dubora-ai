import axios from "axios";

// Lazy: read at call time, not at module load time — same reasoning as
// getGroq() in the other utils (see server.js for the full story).
function getVoicePools() {
  return {
    male: (process.env.ELEVENLABS_MALE_VOICE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
    female: (process.env.ELEVENLABS_FEMALE_VOICE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

// Deterministically assigns one voice ID per distinct speaker, round-robin
// within that speaker's gender pool, so a video with "2 male, 2 female"
// speakers gets 4 different voices instead of everyone sharing one. Called
// ONCE per caption doc (not per line) — see controllers/dubController.js —
// and the result is stored in Caption.voiceMap so the same character keeps
// the same voice even across re-dubs or after translation.
export function assignVoices(captionLines, existingVoiceMap = {}) {
  const { male: MALE_VOICE_IDS, female: FEMALE_VOICE_IDS } = getVoicePools();
  const voiceMap = { ...existingVoiceMap };
  let maleIdx = 0;
  let femaleIdx = 0;

  // Count how many distinct speakers of each gender already have a voice,
  // so re-assigning (e.g. after new speakers appear from a re-transcribe)
  // doesn't reset everyone back to the first voice in the pool.
  const usedMale = new Set(Object.entries(voiceMap).filter(([, v]) => MALE_VOICE_IDS.includes(v)).map(([, v]) => v));
  const usedFemale = new Set(Object.entries(voiceMap).filter(([, v]) => FEMALE_VOICE_IDS.includes(v)).map(([, v]) => v));
  maleIdx = usedMale.size;
  femaleIdx = usedFemale.size;

  for (const line of captionLines) {
    if (voiceMap[line.speaker]) continue; // already assigned

    if (line.gender === "female" && FEMALE_VOICE_IDS.length > 0) {
      voiceMap[line.speaker] = FEMALE_VOICE_IDS[femaleIdx % FEMALE_VOICE_IDS.length];
      femaleIdx++;
    } else if (line.gender === "male" && MALE_VOICE_IDS.length > 0) {
      voiceMap[line.speaker] = MALE_VOICE_IDS[maleIdx % MALE_VOICE_IDS.length];
      maleIdx++;
    } else {
      // Unknown gender — fall back to whichever pool has voices, male first.
      const pool = MALE_VOICE_IDS.length > 0 ? MALE_VOICE_IDS : FEMALE_VOICE_IDS;
      voiceMap[line.speaker] = pool[(maleIdx + femaleIdx) % pool.length];
    }
  }

  return voiceMap;
}

// Synthesizes one line of text with a specific ElevenLabs voice. Returns
// an mp3 Buffer. Throws on failure — callers (utils/dubEngine.js) decide
// how to handle a single line failing (currently: abort the whole job,
// since a missing line would leave a silent gap in the dub).
export async function synthesizeSpeech(text, voiceId) {
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: "eleven_multilingual_v2", // needed for non-English dub targets
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );
  return Buffer.from(response.data);
}