import ErrorHandler from "../utils/errorHandler.js";

// Ported from Transcripto AI's middlewares/errors.js: that project classifies
// common Mongoose/JWT failure modes into clean, user-facing messages instead
// of leaking raw driver errors, and only shows full error detail when
// NODE_ENV === "DEVELOPMENT" (never on Vercel, where NODE_ENV is always
// "production" — see config/dbConnect.js for why that check matters).
// Dubverse's version used to just echo err.message for every error, which
// meant a raw Mongoose "buffering timed out" message or a duplicate-key
// error (E11000 ...) could reach the client unfiltered.
export default (err, req, res, next) => {
  console.error(err);

  let error = err;

  if (err.name === "CastError") {
    error = new ErrorHandler(`Invalid: ${err.path}`, 404);
  }

  if (err.name === "ValidationError") {
    error = new ErrorHandler(Object.values(err.errors).map((e) => e.message).join(" "), 400);
  }

  if (err.code === 11000) {
    error = new ErrorHandler(`Duplicate field: ${Object.keys(err.keyValue)}`, 400);
  }

  if (err.name === "JsonWebTokenError") {
    error = new ErrorHandler("Invalid token. Login again.", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new ErrorHandler("Session expired. Login again.", 401);
  }

  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error.",
      error: err,
      stack: err?.stack,
    });
  }

  // Production: only ever surface a message we explicitly created above via
  // ErrorHandler (or that the controller itself raised as one) — anything
  // else (raw driver/internal errors) gets a generic message instead of
  // leaking internals to the client.
  const safeMessage = error instanceof ErrorHandler
    ? error.message
    : "Something went wrong. Please try again.";

  res.status(statusCode).json({ success: false, message: safeMessage });
};
