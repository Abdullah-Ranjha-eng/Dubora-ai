import dns from "dns";
import mongoose from "mongoose";

// Fixes "querySrv ECONNREFUSED" on some Windows/router/VPN DNS setups that
// can't resolve mongodb+srv SRV records even though the connection string
// itself is valid — Node falls back to the OS resolver by default, and on
// some networks that resolver silently refuses this specific query type.
// Pointing Node directly at public DNS sidesteps it entirely, regardless
// of whatever the OS/router is doing.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

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