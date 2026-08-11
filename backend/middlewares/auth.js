import jwt from "jsonwebtoken";
import User from "../models/user.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "./catchAsyncErrors.js";
// Middleware to check if the user is authenticated by verifying the JWT token
export const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next(new ErrorHandler("Login first to access this resource.", 401));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new ErrorHandler("Session expired or invalid. Please log in again.", 401));
  }

  req.user = await User.findById(decoded.id);
  if (!req.user) return next(new ErrorHandler("Login first to access this resource.", 401));
  next();
});
