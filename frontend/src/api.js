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
  baseURL: "/api/v1",
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