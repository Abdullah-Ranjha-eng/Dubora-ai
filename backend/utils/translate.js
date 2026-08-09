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

export const SUPPORTED_LANGUAGES = [
  "Spanish", "French", "German", "Portuguese", "Italian", "Russian",
  "Arabic", "Urdu", "Hindi", "Chinese", "Japanese", "Korean", "Turkish",
];

// Translates caption text only — start/end/speaker/gender/voiceId are
// carried over unchanged by the caller (see controllers/translateController.js),
// so a translation never touches timing or voice assignment.
export async function translateCaptionTexts(texts, targetLanguage) {
  const prompt = `Translate each of the following lines into ${targetLanguage}. Keep the same order, same count, same tone/register. Return ONLY a JSON array of strings, no prose, no markdown fences.

${JSON.stringify(texts)}`;

  const completion = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
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
    throw new Error("Translation: model did not return valid JSON.");
  }

  return texts.map((original, i) => parsed[i] || original);
}