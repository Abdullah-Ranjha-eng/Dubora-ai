import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index.js";
import { useAuthStore } from "./stores/auth.js";
import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Mount immediately so the homepage renders right away instead of staying
// blank while /auth/me is in flight (or hanging on a slow/cold backend).
// The profile check still runs, just in the background — Navbar/Dashboard
// already react to `auth.initialized`/`auth.user`, so a logged-in user's
// UI updates the moment fetchProfile() resolves, it just no longer blocks
// first paint.
app.mount("#app");
useAuthStore().fetchProfile();