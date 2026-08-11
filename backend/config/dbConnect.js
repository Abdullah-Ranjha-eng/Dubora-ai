import dns from "dns";
import mongoose from "mongoose";

// Only override DNS locally.
// Vercel uses its own DNS/network environment.
if (!process.env.VERCEL) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Cache the connection promise so warm Vercel
// instances don't create a new connection per request.
let connectionPromise = null;

export const connectDatabase = () => {
  if (connectionPromise) return connectionPromise;

  const DB_URI = process.env.DB_URI;

  if (!DB_URI) {
    return Promise.reject(
      new Error(
        "DB_URI is not set. Add it to config/config.env locally, or to your Vercel project's Environment Variables."
      )
    );
  }

  connectionPromise = mongoose
    .connect(DB_URI)
    .then((con) => {
      console.log(`MongoDB connected: ${con.connection.host}`);
      return true;
    });

  // Don't permanently cache a failed connection.
  connectionPromise.catch(() => {
    connectionPromise = null;
  });

  return connectionPromise;
};