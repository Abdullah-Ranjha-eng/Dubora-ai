import mongoose from "mongoose";

export const connectDatabase = () => {
  const DB_URI = process.env.NODE_ENV === "DEVELOPMENT" ? process.env.DB_LOCAL_URI : process.env.DB_URI;

  // Previously this swallowed the connection error and resolved `false`,
  // and app.js started the HTTP server regardless of the result. That let
  // the server come up "green" even with zero DB connectivity — every
  // route touching Mongo (upload, get video, generate captions, etc.)
  // would then hang for Mongoose's buffering timeout and fail with a
  // generic 500, which from the frontend looks like a broken/stuck page
  // rather than a clear "database unreachable" error. Now we let the
  // rejection propagate so app.js can refuse to start instead.
  return mongoose.connect(DB_URI).then((con) => {
    console.log(`MongoDB connected: ${con.connection.host}`);
    return true;
  });
};