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

export default async function handler(req, res) {
  // connectDatabase() caches its connection promise (see config/dbConnect.js)
  // so this only actually opens a connection on a cold start — warm
  // invocations resolve this instantly against the cached promise.
  try {
    await connectDatabase();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Database unavailable. Try again shortly." }));
    return;
  }

  return serverlessHandler(req, res);
}
