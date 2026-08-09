import { defineStore } from "pinia";
import api from "../api.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: false,
    error: "",
    // Set once the initial /auth/me check (see main.js) has resolved, so
    // the Navbar doesn't flash "Sign In" for a logged-in user while that
    // request is still in flight on page load.
    initialized: false,
  }),
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await api.post("/auth/login", { email, password });
        this.user = data.user;
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Login failed.";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async register(name, email, password) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await api.post("/auth/register", { name, email, password });
        this.user = data.user;
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Registration failed.";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await api.get("/auth/logout");
      } finally {
        this.user = null;
      }
    },

    // Called once on app boot (see main.js) to restore a session from the
    // "token" cookie, if one exists. Failing silently here is intentional —
    // "not logged in" isn't an error state, it's the default for guests.
    async fetchProfile() {
      try {
        const { data } = await api.get("/auth/me");
        this.user = data.user;
      } catch {
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
  },
});
