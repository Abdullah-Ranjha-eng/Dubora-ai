// Minimal ownership model: every video/caption is tagged with an "owner"
// string, which is either the logged-in user's id (decoded from the
// "token" JWT cookie set by controllers/authController.js) or a guest id
// the frontend generates and sends back on every request via the
// X-Guest-Id header (stored in localStorage on the frontend). A guest who
// later logs in simply starts a new owner id going forward — this does not
// migrate their pre-login videos onto the account.
import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const identifyUser = async (req, res, next) => {
  const token = req.cookies?.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.ownerId = user._id.toString();
        return next();
      }
    } catch {
      // Expired/invalid token — fall through to guest handling instead of
      // rejecting outright, so a stale cookie doesn't lock someone out of
      // work they were doing as a guest before it expired.
    }
  }

  const guestId = req.headers["x-guest-id"];
  req.ownerId = guestId || null;
  if (!req.ownerId) {
    return res.status(400).json({ success: false, message: "Missing X-Guest-Id header (or auth)." });
  }
  next();
};

export const ownerFields = (req) => ({ owner: req.ownerId });
export const isOwner = (doc, req) => doc.owner === req.ownerId;
