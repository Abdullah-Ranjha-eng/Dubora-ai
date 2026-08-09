// Same cross-site cookie problem Transcripto AI's utils/jwtToken.js
// documents: if frontend and backend end up on different domains in
// production (e.g. separate Vercel deployments), the cookie only survives
// as SameSite=None + Secure. BUT secure:true means the browser refuses to
// even store the cookie over plain http — which is exactly what local dev
// (http://localhost:5173 -> http://localhost:5000) uses. Hardcoding
// secure:true there would make login silently "succeed" (200 response)
// while the browser drops the cookie, so every following request looks
// logged-out. Base it on NODE_ENV instead so both cases work.
const isProd = process.env.NODE_ENV === "PRODUCTION";

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

  res
    .status(statusCode)
    .cookie("token", token, { ...AUTH_COOKIE_OPTIONS, expires })
    .json({ success: true, user: safeUser });
};

export default sendToken;
