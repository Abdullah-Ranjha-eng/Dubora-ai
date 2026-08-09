// This file exists ONLY to fix an ESM import-ordering bug: static `import`
// statements in a module are hoisted and evaluated before any of that
// module's own top-level code runs, regardless of where they're written
// textually. app.js used to call dotenv.config() "before" its own
// `import videoRoutes from "./routes/video.js"` line — but since that's a
// static import, Node actually loaded the ENTIRE route -> controller ->
// util chain (including utils/whisper.js, which constructs a Groq client
// with process.env.GROQ_API_KEY at module load time) before dotenv.config()
// ever ran. process.env.GROQ_API_KEY was still empty at that point, even
// though config.env has it set correctly — hence "GROQ_API_KEY is missing
// or empty" despite it very much not being missing from the file.
//
// A dynamic import() is NOT hoisted — it only runs when this line is
// actually reached — so calling dotenv.config() first, then dynamically
// importing app.js, guarantees env vars are in process.env before anything
// in app.js's module graph loads. Run this file (npm run dev / npm start
// both point here now), not app.js directly.
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "config/config.env") });

await import("./app.js");