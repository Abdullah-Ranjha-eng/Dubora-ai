// Vercel entrypoint. This file (not app.js or server.js) is what
// vercel.json routes every request to — see the "rewrites" rule there.
//
// No dotenv here: unlike local dev (server.js), Vercel injects environment
// variables directly into process.env for every function invocation —
// there is no config.env file in the deployed bundle (it's gitignored on
// purpose, see backend/.gitignore), and there doesn't need to be one.
import serverless from "serverless-http";
import app from "../app.js";
import { connectDatabase } from "../config/dbConnect.js";

const serverlessHandler = serverless(app);

// CORS preflight (OPTIONS) never touches the database or a route handler —
// the `cors` middleware in app.js answers it directly. Waiting on
// connectDatabase() first for these was pure wasted risk: every preflight
// was paying the cost (and hang risk) of a DB connection it never needed.
const isPreflight = (req) => req.method === "OPTIONS";

// Belt-and-suspenders on top of dbConnect.js's own serverSelectionTimeoutMS:
// race the connect attempt against a hard local timeout so that even if
// something downstream of mongoose.connect() itself stalls (a hung DNS
// lookup, a stuck socket, anything not covered by mongoose's own timeout
// option), this function still fails fast with a clear 503 instead of
// silently burning the entire 60s maxDuration with zero response — which
// is the exact "Task timed out after 60 seconds" pattern seen in the logs.
// Kept comfortably under maxDuration (60s in vercel.json) so there's
// always time left to send this response.
function withHardTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} took longer than ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  if (isPreflight(req)) {
    return serverlessHandler(req, res);
  }

  // connectDatabase() caches its connection promise (see config/dbConnect.js)
  // so this only actually opens a connection on a cold start — warm
  // invocations resolve this instantly against the cached promise.
  try {
    await withHardTimeout(connectDatabase(), 12_000, "MongoDB connection");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Database unavailable. Try again shortly." }));
    return;
  }

  return serverlessHandler(req, res);
}