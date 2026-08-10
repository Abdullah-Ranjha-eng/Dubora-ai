import mongoose from "mongoose";

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

  const DB_URI = process.env.NODE_ENV === "DEVELOPMENT" ? process.env.DB_LOCAL_URI : process.env.DB_URI;

  // Previously this swallowed the connection error and resolved `false`,
  // and app.js started the HTTP server regardless of the result. That let
  // the server come up "green" even with zero DB connectivity — every
  // route touching Mongo (upload, get video, generate captions, etc.)
  // would then hang for Mongoose's buffering timeout and fail with a
  // generic 500, which from the frontend looks like a broken/stuck page
  // rather than a clear "database unreachable" error. Now we let the
  // rejection propagate so app.js can refuse to start instead.
  connectionPromise = mongoose.connect(DB_URI).then((con) => {
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