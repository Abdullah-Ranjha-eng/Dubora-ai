import User from "../models/user.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import sendToken, { AUTH_COOKIE_OPTIONS } from "../utils/jwtToken.js";

// POST /api/v1/auth/register
export const registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return next(new ErrorHandler("Name, email, and password are required.", 400));

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new ErrorHandler("An account with that email already exists.", 400));

  const user = await User.create({ name, email, password });
  sendToken(user, 201, res);
});

// POST /api/v1/auth/login
export const loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new ErrorHandler("Please enter email and password.", 400));

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    return next(new ErrorHandler("Invalid email or password.", 401));

  sendToken(user, 200, res);
});

// GET /api/v1/auth/logout
export const logoutUser = catchAsyncErrors(async (req, res) => {
  res.cookie("token", null, { ...AUTH_COOKIE_OPTIONS, expires: new Date(Date.now()) });
  res.status(200).json({ success: true, message: "Logged out successfully." });
});

// GET /api/v1/auth/me
export const getUserProfile = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});
