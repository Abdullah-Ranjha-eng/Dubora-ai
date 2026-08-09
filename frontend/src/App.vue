<template>
  <div :class="theme.isDark ? 'dark bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'" class="min-h-screen transition-colors duration-300">
    <Navbar />
    <router-view />
    <AppFooter />
  </div>
</template>

<script setup>
import { watch } from "vue";
import Navbar from "./components/Navbar.vue";
import AppFooter from "./components/AppFooter.vue";
import { useThemeStore } from "./stores/theme.js";
const theme = useThemeStore();

// Keep the scrollbar track (main.css, --scrollbar-track) in sync with the
// page background so it never shows the browser's default white — Tailwind's
// bg-gray-950 / bg-gray-50, matching the classes bound on the root div above.
watch(
  () => theme.isDark,
  (isDark) => {
    document.documentElement.style.setProperty(
      "--scrollbar-track",
      isDark ? "#10131c" : "#f9fafb"
    );
  },
  { immediate: true }
);
</script>