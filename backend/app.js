import path from "path";
import { fileURLToPath } from "url";

// __dirname is unused directly here now, but kept for anything else in
// this file that may need a path relative to this module later.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";
import { connectDatabase } from "./config/dbConnect.js";
import errorMiddleware from "./middlewares/errors.js";

import videoRoutes from "./routes/video.js";
import captionRoutes from "./routes/caption.js";
import dubRoutes from "./routes/dub.js";
import authRoutes from "./routes/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// credentials: true is required for the browser to send/receive the
// "token" auth cookie cross-origin — without it, the Set-Cookie from
// login/register gets silently dropped no matter what cookie flags are set.
// NOTE: origin can't be "*" once credentials is true (browsers reject
// that combination outright), so this needs a real FRONTEND_URL set in
// production — the localhost fallback below is dev-only.
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => res.json({ success: true, message: "DubVerse API is running." }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", videoRoutes);
app.use("/api/v1", captionRoutes);
app.use("/api/v1", dubRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`DubVerse API listening on port ${PORT}`));
  })
  .catch((err) => {
    // Fail loudly and don't start accepting requests on a DB-less server —
    // see the comment in config/dbConnect.js for why this matters.
    console.error(`Failed to start: could not connect to MongoDB — ${err.message}`);
    process.exit(1);
  });

export default app;