import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";
import errorMiddleware from "./middlewares/errors.js";
import { connectDatabase } from "./config/dbConnect.js";

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
// that combination outright).
//
// Allowlist (not a single string) — same pattern as Transcripto AI's
// app.js — so the deployed frontend AND localhost:5173 both work against
// this backend at the same time, instead of needing FRONTEND_URL swapped
// between environments. FRONTEND_URL can hold a comma-separated list if
// there's more than one deployed frontend origin to allow.
const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((s) => s.trim()) : []),
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Races connectDatabase() against a hard local timeout so a stalled
// connection (bad URI, IP not allowlisted, a network-level hang below
// Mongoose's own serverSelectionTimeoutMS) fails fast with a clear 503
// instead of silently burning the whole function duration with zero
// response. Kept from the previous Vercel-handler-level version of this
// check — that part was already correct.
//
// What changed: this now lives as Express middleware scoped to "/api/v1"
// — matching Transcripto AI's app.js pattern — instead of wrapping every
// request at the Vercel-handler level (see api/index.js). Scoping it here
// means /favicon.ico, /favicon.png, /robots.txt, and "/" never reach this
// middleware at all; Express's own routing 404s them immediately with zero
// DB cost, the same way it already did for "/" before. No manual per-path
// skip-list needed — that was treating the symptom, this fixes the
// structure. OPTIONS preflight is also handled before this ever runs:
// the cors() middleware above answers preflight directly and doesn't call
// next() into this or any route below it.
function withHardTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} took longer than ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

app.use("/api/v1", async (req, res, next) => {
  try {
    // connectDatabase() caches its connection promise (see config/dbConnect.js)
    // so this only actually opens a connection on a cold start — warm
    // invocations resolve this instantly against the cached promise.
    await withHardTimeout(connectDatabase(), 12_000, "MongoDB connection");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    return res.status(503).json({ success: false, message: "Database unavailable. Try again shortly." });
  }
  next();
});

app.get("/api/v1/health", (req, res) => res.json({ success: true, message: "DubVerse API is running." }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", videoRoutes);
app.use("/api/v1", captionRoutes);
app.use("/api/v1", dubRoutes);

app.use(errorMiddleware);

// server.js (local dev) and api/index.js (Vercel) each still separately
// kick off connectDatabase() as early as possible (module load / before
// listen) so the cache above is usually already warm by the time a real
// request hits the middleware — this module just builds the Express app
// and owns the per-request wait, not the initial connection lifecycle.
export default app;