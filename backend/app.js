import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";
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

// NOTE: no app.listen() here, and no connectDatabase() call — this module
// only builds the Express app. server.js (local dev) and api/index.js
// (Vercel) each own connecting to the DB and exposing this app their own
// way, because "start an HTTP server" and "export a request handler for a
// serverless platform" are fundamentally different operations that don't
// belong bundled into the same self-executing module.
export default app;