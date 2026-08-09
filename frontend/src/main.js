import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index.js";
import { useAuthStore } from "./stores/auth.js";
import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Restore a session from the "token" cookie (if any) before mounting, so
// the Navbar/Dashboard don't render a logged-out flash for a returning user.
useAuthStore().fetchProfile().finally(() => app.mount("#app"));
