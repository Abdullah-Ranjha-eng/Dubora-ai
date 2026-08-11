import dns from "dns";
import mongoose from "mongoose";

// Fixes "querySrv ECONNREFUSED" on some Windows/router/VPN DNS setups that
// can't resolve mongodb+srv SRV records even though the connection string
// itself is valid — Node falls back to the OS resolver by default, and on
// some networks that resolver silently refuses this specific query type.
// Pointing Node directly at public DNS sidesteps it entirely, regardless
// of whatever the OS/router is doing.
//
// IMPORTANT: only do this locally. On Vercel this rewrites DNS resolution
// for the entire function process, and Vercel's sandboxed network doesn't
// treat outbound UDP:53 to arbitrary third-party resolvers the same way a
// normal machine does — lookups against 8.8.8.8/1.1.1.1 there can be slow
// or stall outright. Mongoose keeps re-resolving all replica set members
// in the background for topology awareness, so a single stalled lookup can
// hang a request well past the initial mongoose.connect() success, which
// is exactly the "connects fine, then the request still times out at 60s"
// behavior seen in production. `VERCEL` is set automatically in every
// Vercel function invocation, so this only applies the workaround locally,
// where the original DNS problem actually occurs.
if (!process.env.VERCEL) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

<<<<<<< HEAD
// On Vercel, each request can be handled by a "warm" container that
// already ran a previous request — module-level state (like this cached
// promise) survives between those invocations. Without caching, every
// single request would call mongoose.connect() again: slow (a fresh
// connection handshake per request) and eventually breaks outright (each
// serverless invocation opening its own connection can exhaust MongoDB
// Atlas's connection limit under real traffic). This makes connectDatabase()
// safe to call at the top of every request — it only actually connects once
// per warm container.
let connectionPromise = null;

export const connectDatabase = () => {
  if (connectionPromise) return connectionPromise;

  // Single connection string, same one locally and on Vercel — no more
  // NODE_ENV-based switching between a local mongod and Atlas. That
  // switch is what caused this project to connect to a nonexistent
  // 127.0.0.1:27017 on Vercel earlier: NODE_ENV got copied into Vercel's
  // env vars along with everything else in config.env, which silently
  // flipped it back to "local" in production. One variable, one place to
  // set it correctly, nothing for an env var import to accidentally break.
  const DB_URI = process.env.DB_URI;
  if (!DB_URI) {
    return Promise.reject(new Error("DB_URI is not set. Add it to config/config.env locally, or to your Vercel project's Environment Variables."));
  }

  // serverSelectionTimeoutMS defaults to 30s, which combined with the
  // downstream work in a request handler can eat most of Vercel's 60s
  // maxDuration before anything useful even runs. 10s is plenty for a
  // healthy cluster and means a real connectivity problem (bad URI, IP
  // not allowlisted, cluster paused, etc.) surfaces as a fast, clear
  // error — 503 from api/index.js — instead of a silent hang that only
  // shows up as an opaque "Task timed out after 60 seconds" in the logs.
  //
  // connectTimeoutMS bounds the initial TCP/TLS handshake itself (a
  // separate stage from server *selection*) — without it, a network-level
  // stall here isn't guaranteed to respect serverSelectionTimeoutMS at
  // all, which is the likely cause if 60s "Task timed out" errors are
  // still showing up even with the timeouts below and the hard race in
  // api/index.js: it means something upstream of both of those is hanging.
  // family: 4 skips a possibly-slow/absent AAAA lookup before falling back
  // to A — most MongoDB Atlas / Vercel setups are IPv4 anyway.
  connectionPromise = mongoose.connect(DB_URI, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    family: 4,
  }).then((con) => {
=======
  // Previously this swallowed the connection error and resolved `false`,
  // and app.js started the HTTP server regardless of the result. That let
  // the server come up "green" even with zero DB connectivity — every
  // route touching Mongo (upload, get video, generate captions, etc.)
  // would then hang for Mongoose's buffering timeout and fail with a
  // generic 500, which from the frontend looks like a broken/stuck page
  // rather than a clear "database unreachable" error. Now we let the
  // rejection propagate so app.js can refuse to start instead
  return mongoose.connect(DB_URI).then((con) => {
>>>>>>> db4fbe1 (updated favicon issue)
    console.log(`MongoDB connected: ${con.connection.host}`);
    return true;
  });

  // If the connection attempt fails, don't leave a rejected promise
  // cached forever — clear it so the NEXT request gets a fresh attempt
  // instead of every future request immediately re-throwing the same
  // stale error.
  connectionPromise.catch(() => { connectionPromise = null; });

  return connectionPromise;
};