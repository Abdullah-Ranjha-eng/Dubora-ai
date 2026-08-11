// Same cross-site cookie problem Transcripto AI's utils/jwtToken.js
// documents: if frontend and backend end up on different domains in
// production (e.g. separate Vercel deployments), the cookie only survives
// as SameSite=None + Secure. BUT secure:true means the browser refuses to
// even store the cookie over plain http — which is exactly what local dev
// (http://localhost:5173 -> http://localhost:5000) uses. Hardcoding
// secure:true there would make login silently "succeed" (200 response)
// while the browser drops the cookie, so every following request looks
// logged-out. Base it on NODE_ENV instead so both cases work.
//
// IMPORTANT: this checks NODE_ENV !== "DEVELOPMENT", not === "PRODUCTION".
// Vercel automatically sets NODE_ENV=production (lowercase) for deployed
// functions and does not let you override it via dashboard env vars — a
// strict equality check against "PRODUCTION" (uppercase) was ALWAYS false
// there, meaning cookies silently used the insecure/lax dev settings in
// the actual production deployment too. Matching dbConnect.js's pattern
// (only "DEVELOPMENT" — set explicitly in config.env for local dev — opts
// OUT of prod behavior) means anything else, including Vercel's lowercase
// value, correctly gets treated as production.
const isProd = process.env.NODE_ENV !== "DEVELOPMENT";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

const sendToken = (user, statusCode, res) => {
  const token = user.getJwtToken();
  const expires = new Date(
    Date.now() + Number(process.env.COOKIE_EXPIRES_TIME || 7) * 24 * 60 * 60 * 1000
  );

  const safeUser = { _id: user._id, name: user.name, email: user.email };

  // token is also returned in the JSON body (matching Transcripto AI's
  // sendToken) — not used by the current frontend (it relies on the
  // httpOnly cookie via withCredentials), but it's a ready-made fallback
  // for a client that can't rely on cross-site cookies (Safari ITP, a
  // future mobile client, etc.) without a backend change later.
  res
    .status(statusCode)
    .cookie("token", token, { ...AUTH_COOKIE_OPTIONS, expires })
    .json({ success: true, token, user: safeUser });
};

export default sendToken;
