import axios from "axios";

// A guest id is generated once and persisted, so a user's videos survive a
// page refresh without needing real auth. Swap this for a real user id
// once login exists — see backend/utils/ownership.js.
function getGuestId() {
  let id = localStorage.getItem("dubverse_guest_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dubverse_guest_id", id);
  }
  return id;
}

const api = axios.create({
  // "/api/v1" only works locally, via vite.config.js's dev-server proxy to
  // http://localhost:5000. In production the frontend and backend are two
  // separate Vercel deployments on different domains — there's no proxy,
  // so a relative path would just hit the FRONTEND's own domain and 404.
  // VITE_API_URL must be set in the frontend's Vercel project settings to
  // the deployed backend's URL (e.g. https://dubverse-api.vercel.app/api/v1).
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
  // Without this, a hung backend call (see utils/whisper.js for why one
  // can hang) means the request promise never settles — which means
  // whatever component set a "busy" flag before awaiting it never resets
  // that flag either, so the button just stays disabled forever with zero
  // feedback. 3 minutes is generous enough for caption generation on a
  // long video while still guaranteeing SOME eventual error instead of an
  // infinite hang
  timeout: 180_000,
});

api.interceptors.request.use((config) => {
  config.headers["X-Guest-Id"] = getGuestId();
  return config;
});

export default api;