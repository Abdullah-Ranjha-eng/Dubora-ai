<template>
  <footer class="relative z-10 border-t mt-24"
    :class="theme.isDark ? 'bg-gray-950/80 border-white/10' : 'bg-white/80 border-gray-200'">
    <div class="max-w-6xl mx-auto px-6 py-14">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

        <!-- Brand -->
        <div>
          <RouterLink to="/" class="flex items-center gap-2.5 mb-4 w-fit">
            <svg viewBox="0 0 280 300" class="h-8 w-auto" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ft-ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stop-color="#FF7A1A"/>
                  <stop offset="50%"  stop-color="#FF2D78"/>
                  <stop offset="100%" stop-color="#7B2FFF"/>
                </linearGradient>
                <linearGradient id="ft-micGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stop-color="#FF7A1A"/>
                  <stop offset="100%" stop-color="#E0640A"/>
                </linearGradient>
                <radialGradient id="ft-innerBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stop-color="#2a1608"/>
                  <stop offset="100%" stop-color="#100804"/>
                </radialGradient>
              </defs>
              <circle cx="140" cy="150" r="108" fill="none" stroke="url(#ft-ringGrad)" stroke-width="1" opacity="0.3"/>
              <circle cx="140" cy="150" r="102" fill="none" stroke="url(#ft-ringGrad)" stroke-width="3.5"/>
              <circle cx="140" cy="150" r="97"  fill="url(#ft-innerBg)"/>
              <rect x="126" y="112" width="28" height="44" rx="14" fill="url(#ft-micGrad)"/>
              <path d="M 112,152 Q 112,178 140,178 Q 168,178 168,152" fill="none" stroke="url(#ft-micGrad)" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="140" y1="178" x2="140" y2="190" stroke="url(#ft-micGrad)" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="126" y1="190" x2="154" y2="190" stroke="url(#ft-micGrad)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="font-extrabold text-lg" :class="theme.isDark ? 'text-white' : 'text-gray-900'">
              Dub<span class="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Verse AI</span>
            </span>
          </RouterLink>
          <p class="text-sm leading-relaxed mb-5" :class="theme.isDark ? 'text-gray-400' : 'text-gray-600'">
            Dub any video with distinct AI voices per speaker. Free, fast, and private.
          </p>
          <div class="flex items-center gap-3">
            <a href="https://github.com/Abdullah-Ranjha-eng" target="_blank" rel="noopener"
              class="p-2 rounded-xl transition-all duration-200"
              :class="theme.isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Tools -->
        <div>
          <h4 class="text-sm font-semibold mb-4 tracking-widest uppercase"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Tools</h4>
          <ul class="space-y-3">
            <li v-for="l in toolLinks" :key="l.label">
              <RouterLink :to="l.to"
                class="text-sm transition-colors duration-200"
                :class="theme.isDark ? 'text-gray-400 hover:text-orange-400' : 'text-gray-600 hover:text-orange-600'">
                {{ l.label }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h4 class="text-sm font-semibold mb-4 tracking-widest uppercase"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Company</h4>
          <ul class="space-y-3">
            <li v-for="l in companyLinks" :key="l.label">
              <RouterLink :to="l.to"
                class="text-sm transition-colors duration-200"
                :class="theme.isDark ? 'text-gray-400 hover:text-orange-400' : 'text-gray-600 hover:text-orange-600'">
                {{ l.label }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- Resources -->
        <div>
          <h4 class="text-sm font-semibold mb-4 tracking-widest uppercase"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Resources</h4>
          <ul class="space-y-3">
            <li v-for="l in resourceLinks" :key="l.label">
              <a :href="l.href" target="_blank" rel="noopener"
                class="text-sm transition-colors duration-200"
                :class="theme.isDark ? 'text-gray-400 hover:text-orange-400' : 'text-gray-600 hover:text-orange-600'">
                {{ l.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
        :class="theme.isDark ? 'border-white/10' : 'border-gray-200'">
        <p class="text-xs text-gray-500">
          © {{ new Date().getFullYear() }} DubVerse AI. Open source under MIT License.
        </p>
        <button @click="theme.toggle()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200"
          :class="theme.isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200'">
          <span>{{ theme.isDark ? '☀️' : '🌙' }}</span>
          {{ theme.isDark ? 'Light' : 'Dark' }} Mode
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useThemeStore } from "../stores/theme.js";
const theme = useThemeStore();

const toolLinks = [
  { label: "Generate Captions", to: "/upload" },
  { label: "Translate Captions", to: "/upload" },
  { label: "AI Dub Voices", to: "/upload" },
  { label: "View All Tools", to: "/about" },
];

const companyLinks = [
  { label: "About", to: "/about" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Register", to: "/register" },
  { label: "Sign In", to: "/login" },
];

// TODO: point these at real destinations once the project has public docs/repo links.
const resourceLinks = [
  { label: "Documentation", href: "https://github.com" },
  { label: "Source Code", href: "https://github.com" },
  { label: "Report an Issue", href: "https://github.com" },
];
</script>
