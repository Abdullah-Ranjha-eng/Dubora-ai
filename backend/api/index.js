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

// Kick off the DB connection as soon as this module loads (once per cold
// start) instead of waiting for the first request to trigger it — same
// idea as Transcripto AI's app.js calling connectDatabase() at module
// load. app.js's own "/api/v1"-scoped middleware (see there) awaits this
// same cached promise before letting any API route run; this line just
// means that wait is usually already resolved by the time a real request
// arrives, instead of starting cold on it.
//
// Previously the DB-wait (plus a hard 12s timeout and a manual per-path
// skip-list for /favicon.ico etc.) lived HERE, wrapped around every
// request before Express ever saw it — which is what made favicon
// requests pay the same DB-connection cost as a real API call. That logic
// now lives in app.js scoped to "/api/v1" instead, matching Transcripto
// AI's structure: Express's own routing naturally 404s anything outside
// that prefix (favicons, robots.txt, "/") with zero DB cost, so no
// skip-list is needed here anymore.
connectDatabase();

export default serverless(app);