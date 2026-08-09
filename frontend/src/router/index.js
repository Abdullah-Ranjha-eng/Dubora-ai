import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import AboutView from "../views/AboutView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import DashboardView from "../views/DashboardView.vue";
import UploadView from "../views/UploadView.vue";
import VideoView from "../views/VideoView.vue";
import { useAuthStore } from "../stores/auth.js";

const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/about", name: "about", component: AboutView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/register", name: "register", component: RegisterView },
  // Dashboard lists every video on the account, so it's gated behind
  // login — see the global guard below, which redirects guests to
  // /login (and bounces them back here once they sign in).
  { path: "/dashboard", name: "dashboard", component: DashboardView, meta: { requiresAuth: true } },
  { path: "/upload", name: "upload", component: UploadView },
  { path: "/video/:videoId", name: "video", component: VideoView, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const auth = useAuthStore();

  // On a hard page load, the boot-time fetchProfile() in main.js may
  // still be in flight — wait for it so we don't bounce a logged-in
  // user to /login just because their session hasn't resolved yet.
  if (!auth.initialized) {
    await auth.fetchProfile();
  }

  if (!auth.user) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;