<template>
  <div class="relative overflow-hidden">
    <ParticleCanvas />

    <div class="fixed inset-0 pointer-events-none" style="z-index:1"
      :class="theme.isDark
        ? 'bg-gradient-to-b from-gray-950/60 via-gray-950/40 to-gray-950'
        : 'bg-gradient-to-b from-gray-50/70 via-gray-50/50 to-gray-50'" />

    <!-- HERO -->
    <section class="relative w-full min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6" style="z-index:2">
      <div class="w-full max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8"
          :class="theme.isDark ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'">
          <span class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          Powered by Groq Whisper + LLaMA 3.3 70B + ElevenLabs
        </div>

        <h1 class="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight mb-6"
          :class="theme.isDark ? 'text-white' : 'text-gray-900'">
          Your videos,<br>
          <span class="bg-gradient-to-r from-orange-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient">
            dubbed instantly
          </span>
        </h1>

        <p class="text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          :class="theme.isDark ? 'text-gray-400' : 'text-gray-600'">
          Upload any video. AI transcribes it, identifies who's speaking, lets you translate to 12 languages,
          then dubs it with a distinct AI voice for every character.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <template v-if="!auth.user">
            <RouterLink to="/upload"
              class="group px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-500 hover:from-orange-500 hover:to-pink-400 rounded-2xl font-bold text-white text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 flex items-center gap-2">
              Upload a Video
              <span class="group-hover:translate-x-1 transition-transform">→</span>
            </RouterLink>
            <RouterLink to="/login"
              class="px-8 py-4 border rounded-2xl font-semibold text-lg backdrop-blur transition-all duration-300"
              :class="theme.isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'">
              Login for Dashboard
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/dashboard"
              class="group px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-500 hover:from-orange-500 hover:to-pink-400 rounded-2xl font-bold text-white text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 flex items-center gap-2">
              Go to Dashboard
              <span class="group-hover:translate-x-1 transition-transform">→</span>
            </RouterLink>
            <RouterLink to="/upload"
              class="px-8 py-4 border rounded-2xl font-semibold text-lg backdrop-blur transition-all duration-300"
              :class="theme.isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'">
              Upload Video →
            </RouterLink>
          </template>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto">
          <div v-for="s in stats" :key="s.label"
            class="rounded-2xl p-3 sm:p-5 text-center border backdrop-blur transition-colors"
            :class="theme.isDark ? 'bg-white/5 border-white/10 hover:border-orange-500/40' : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm'">
            <div class="text-xl sm:text-3xl font-extrabold mb-0.5 sm:mb-1"
              :class="theme.isDark ? 'text-white' : 'text-gray-900'">{{ s.value }}</div>
            <div class="text-[10px] sm:text-xs text-gray-500">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="relative" style="z-index:2">

      <!-- How it works -->
      <section class="py-24 px-6">
        <div class="max-w-6xl mx-auto">
          <p class="text-center text-xs font-semibold text-orange-400 tracking-widest uppercase mb-4">How it works</p>
          <h2 class="text-center text-4xl font-bold mb-4"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Four steps to a fully dubbed video</h2>
          <p class="text-center text-base max-w-xl mx-auto mb-16"
            :class="theme.isDark ? 'text-gray-500' : 'text-gray-600'">
            From raw footage to a dubbed, downloadable video — no software to install, no account needed to try.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div v-for="(f, i) in features" :key="f.title"
              class="group border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              :class="theme.isDark
                ? 'bg-white/5 hover:bg-white/8 backdrop-blur border-white/10 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10'
                : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm hover:shadow-md'">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/40 to-pink-500/20 border border-orange-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                {{ f.icon }}
              </div>
              <div class="text-xs text-orange-400 font-semibold mb-2">0{{ i + 1 }}</div>
              <h3 class="font-bold mb-2" :class="theme.isDark ? 'text-white' : 'text-gray-900'">{{ f.title }}</h3>
              <p class="text-sm leading-relaxed" :class="theme.isDark ? 'text-gray-500' : 'text-gray-600'">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Why choose us -->
      <section class="py-24 px-6"
        :class="theme.isDark ? 'bg-orange-950/20' : 'bg-orange-50/60'">
        <div class="max-w-6xl mx-auto">
          <p class="text-center text-xs font-semibold text-pink-400 tracking-widest uppercase mb-4">Why Dubora AI</p>
          <h2 class="text-center text-4xl font-bold mb-4"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Everything you need, nothing you don't</h2>
          <p class="text-center text-base max-w-xl mx-auto mb-16"
            :class="theme.isDark ? 'text-gray-500' : 'text-gray-600'">
            We built Dubora AI to be the dubbing tool we always wished existed — fast, natural-sounding, and completely free.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="w in whyUs" :key="w.title"
              class="border rounded-2xl p-6 transition-colors"
              :class="theme.isDark ? 'bg-white/5 border-white/10 hover:border-orange-500/30' : 'bg-white border-gray-200 hover:border-orange-200 shadow-sm'">
              <div class="text-3xl mb-4">{{ w.icon }}</div>
              <h3 class="font-bold mb-2" :class="theme.isDark ? 'text-white' : 'text-gray-900'">{{ w.title }}</h3>
              <p class="text-sm leading-relaxed" :class="theme.isDark ? 'text-gray-500' : 'text-gray-600'">{{ w.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Use cases -->
      <section class="py-24 px-6">
        <div class="max-w-6xl mx-auto">
          <p class="text-center text-xs font-semibold text-orange-400 tracking-widest uppercase mb-4">Use Cases</p>
          <h2 class="text-center text-4xl font-bold mb-16"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Built for creators of all kinds</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="u in useCases" :key="u.role"
              class="border rounded-2xl p-8 flex gap-5 items-start transition-colors"
              :class="theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'">
              <div class="text-4xl shrink-0">{{ u.icon }}</div>
              <div>
                <div class="text-xs font-semibold text-orange-400 mb-1 uppercase tracking-wider">{{ u.role }}</div>
                <p class="text-sm leading-relaxed" :class="theme.isDark ? 'text-gray-400' : 'text-gray-600'">{{ u.quote }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Languages -->
      <section class="py-24 px-6"
        :class="theme.isDark ? 'bg-gray-900/30' : 'bg-gray-100/60'">
        <div class="max-w-4xl mx-auto text-center">
          <p class="text-xs font-semibold text-pink-400 tracking-widest uppercase mb-4">Multilingual</p>
          <h2 class="text-4xl font-bold mb-4"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">12 languages. One click.</h2>
          <p class="text-base mb-12"
            :class="theme.isDark ? 'text-gray-500' : 'text-gray-600'">
            Auto-detect the source language, then translate and dub into any of these with a single click.
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <span v-for="lang in languages" :key="lang"
              class="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
              :class="theme.isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:border-orange-500/40' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 shadow-sm'">
              {{ lang }}
            </span>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-24 px-6">
        <div class="max-w-2xl mx-auto text-center border rounded-3xl p-12 backdrop-blur"
          :class="theme.isDark ? 'bg-gradient-to-r from-orange-600/20 to-pink-500/10 border-orange-500/20' : 'bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200'">
          <h2 class="text-3xl font-bold mb-4"
            :class="theme.isDark ? 'text-white' : 'text-gray-900'">Ready to dub your video?</h2>
          <p class="mb-8" :class="theme.isDark ? 'text-gray-400' : 'text-gray-600'">
            No credit card required. Up and running in under 60 seconds.
          </p>
          <RouterLink v-if="!auth.user" to="/register"
            class="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-500 hover:from-orange-500 hover:to-pink-400 rounded-2xl font-bold text-white shadow-xl shadow-orange-500/30 transition-all duration-300">
            Create Free Account →
          </RouterLink>
          <RouterLink v-else to="/upload"
            class="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-500 hover:from-orange-500 hover:to-pink-400 rounded-2xl font-bold text-white shadow-xl shadow-orange-500/30 transition-all duration-300">
            Upload a Video →
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import ParticleCanvas from "../components/ParticleCanvas.vue";
import { useThemeStore } from "../stores/theme.js";
import { useAuthStore } from "../stores/auth.js";
const auth = useAuthStore();
const theme = useThemeStore();

const stats = [
  { value: "12+",   label: "Languages supported" },
  { value: "< 60s", label: "Average caption time" },
  { value: "1/spkr", label: "Distinct AI voice per speaker" },
];

const features = [
  { icon: "📤", title: "Upload Video",      desc: "Drop any MP4, MOV, AVI or MKV file. Files are stored securely on Cloudinary and never shared." },
  { icon: "🎙️", title: "AI Transcription", desc: "Groq Whisper large-v3 transcribes your video and labels each line with a speaker and gender." },
  { icon: "🌍", title: "Edit & Translate",  desc: "Edit any caption line directly in the browser. Translate the entire caption set to 12 languages with one click." },
  { icon: "🎭", title: "AI Dub",            desc: "Every speaker gets their own AI voice, time-fit to the original timing, and mixed back onto your video." },
];

const whyUs = [
  { icon: "⚡", title: "Blazing Fast",        desc: "Groq's inference engine is 10× faster than traditional GPU APIs. Most videos are transcribed in under 60 seconds." },
  { icon: "🎯", title: "Pinpoint Accuracy",   desc: "Whisper large-v3 delivers near-human transcription quality across dozens of languages." },
  { icon: "🎭", title: "Per-Speaker Voices",  desc: "Distinct AI voices are assigned per character, not per line, so the same voice sticks with the same speaker throughout." },
  { icon: "✏️", title: "Inline Caption Editor", desc: "Fix any word, adjust timestamps, or rewrite entire lines — all in the browser, no downloads needed." },
  { icon: "🌐", title: "12-Language Translation", desc: "LLaMA 3.3 70B translates your captions context-aware, preserving meaning before dubbing." },
  { icon: "💸", title: "Completely Free",     desc: "No subscriptions, no watermarks, no minute limits. Dubora AI is open-source software." },
];

const useCases = [
  { icon: "🎓", role: "Students",   quote: "Turn lecture recordings into your own language automatically dubbed for easier review." },
  { icon: "🎬", role: "Creators",   quote: "Dub YouTube videos, TikToks, or Reels with natural AI voices. Reach international audiences with one click." },
  { icon: "👩‍🏫", role: "Teachers",  quote: "Make classroom recordings accessible with dubbed audio for students who speak another language." },
  { icon: "🏢", role: "Businesses", quote: "Dub webinars, product demos, and training videos without sending footage to third-party voice actors." },
];

const languages = ["Arabic", "French", "Spanish", "German", "Urdu", "Hindi", "Chinese", "Turkish", "Russian", "Italian", "Portuguese", "Japanese"];
</script>
