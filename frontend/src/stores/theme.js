import { defineStore } from "pinia";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    isDark: localStorage.getItem("dubverse_theme") !== "light", // dark by default
  }),
  actions: {
    toggle() {
      this.isDark = !this.isDark;
      localStorage.setItem("dubverse_theme", this.isDark ? "dark" : "light");
    },
  },
});
