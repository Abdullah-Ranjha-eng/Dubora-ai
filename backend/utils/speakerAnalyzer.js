import Groq from "groq-sdk";

// Lazy client: constructed on first use, not at module load time —
// module-top-level construction bit us once already (see server.js
// for the full story on the ESM import-ordering bug this avoids). timeout
// added so a hung call fails cleanly instead of hanging forever with no
// feedback — see utils/whisper.js for the full reasoning.
let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60_000, maxRetries: 1 });
  return groq;
}

// Text-only speaker attribution: no audio diarization, just the transcript.
// The model has to infer speaker changes and identity from context —
// turn-taking patterns ("question... answer..."), direct address ("Hey
// Sarah, ..." implies the NEXT line is likely Sarah replying, not that the
// current line IS Sarah), self-introductions ("I'm Marcus"), and so on.
// This is inherently less reliable than real audio diarization (it can't
// hear that two lines are literally the same voice) — swap this module for
// a diarization-API-backed version later if character attribution accuracy
// matters more than avoiding the extra API/cost. See models/caption.js for
// where speaker/gender end up being stored.
//
// Input: [{ start, end, text }] (from utils/whisper.js)
// Output: same array with `speaker` and `gender` added per line.
export async function analyzeSpeakers(segments) {
  if (segments.length === 0) return segments;

  const numbered = segments.map((s, i) => `${i}: ${s.text}`).join("\n");

  const prompt = `You are analyzing a video transcript to identify who is speaking each line.

Transcript (one line per index, in chronological order):
${numbered}

For EACH line, determine:
1. "speaker" — the character's actual NAME if it's inferable from dialogue context (someone is addressed by name and then responds, someone introduces themselves, a name is used in a way that clearly identifies the speaker). If no name is inferable, use a consistent generic label per distinct voice: "Speaker 1", "Speaker 2", etc. Reuse the EXACT same speaker value for every line spoken by the same person — do not invent a new label for a person who already spoke earlier.
2. "gender" — "male", "female", or "unknown" if you truly can't tell (pronouns referring to them, name gender association, or context).

Return ONLY a JSON array, same length and order as the input, no prose, no markdown fences:
[{"speaker": "...", "gender": "male|female|unknown"}, ...]`;

  const completion = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0].message.content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Speaker analysis: model did not return valid JSON.");
  }

  // Same defensive fallback pattern as translateController.js in the
  // previous project — if the model drops a line, don't silently corrupt
  // that line's data, just leave it unlabeled rather than misattributed.
  return segments.map((seg, i) => ({
    ...seg,
    speaker: parsed[i]?.speaker || "Speaker 1",
    gender: ["male", "female"].includes(parsed[i]?.gender) ? parsed[i].gender : "unknown",
  }));
}