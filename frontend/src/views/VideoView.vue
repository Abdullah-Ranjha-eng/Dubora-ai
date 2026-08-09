<template>
  <main class="max-w-5xl mx-auto px-6 pt-32 pb-16">
    <LoadingSpinner v-if="store.loading && !store.currentVideo" />

    <template v-else-if="store.currentVideo">
      <div class="flex items-center gap-3 mb-6">
        <RouterLink to="/dashboard" class="text-sm text-gray-500 hover:text-orange-400">← Dashboard</RouterLink>
        <span class="text-gray-700">/</span>
        <h1 class="text-xl font-bold truncate" :class="theme.isDark ? 'text-white' : 'text-gray-900'">{{ store.currentVideo.title }}</h1>
        <span class="text-xs px-2 py-0.5 rounded-full ml-auto" :class="statusClass(store.currentVideo.status)">
          {{ store.currentVideo.status }}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Left: video player -->
        <div class="space-y-4">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden aspect-video">
            <video v-if="activeVideoUrl" :src="activeVideoUrl" controls class="w-full h-full object-contain" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-600 text-4xl">🎬</div>
          </div>

          <!-- Toggle dubbed / original -->
          <div v-if="store.currentVideo.dubbedVideo?.url" class="flex gap-2">
            <button @click="showDubbed = false"
              :class="!showDubbed ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'"
              class="flex-1 py-2 rounded-lg text-sm font-medium transition">Original</button>
            <button @click="showDubbed = true"
              :class="showDubbed ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'"
              class="flex-1 py-2 rounded-lg text-sm font-medium transition">Dubbed 🎭</button>
          </div>

          <!-- Action buttons -->
          <div class="grid grid-cols-2 gap-2">
            <button v-if="!hasCaptions" @click="handleGenerate"
              :disabled="!!store.loading"
              class="col-span-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 rounded-lg py-2.5 text-sm font-semibold text-white transition">
              {{ store.loading && step === 'generate' ? "Transcribing + identifying speakers…" : "🎙️ Generate Captions" }}
            </button>

            <template v-if="hasCaptions">
              <!-- Translate -->
              <div class="col-span-2 flex gap-2">
                <select v-model="targetLang" class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Original</option>
                  <option v-for="l in store.languages" :key="l">{{ l }}</option>
                </select>
                <button @click="handleTranslate"
                  :disabled="!targetLang || !!store.loading"
                  class="px-4 bg-pink-700 hover:bg-pink-600 disabled:opacity-40 rounded-lg text-sm font-semibold text-white transition">
                  {{ store.loading && step === 'translate' ? "…" : "Translate" }}
                </button>
              </div>

              <!-- AI Dub -->
              <button @click="handleDub"
                :disabled="!!store.loading"
                class="col-span-2 bg-gradient-to-r from-orange-600 to-pink-500 hover:from-orange-500 hover:to-pink-400 disabled:opacity-40 rounded-lg py-2.5 text-sm font-semibold text-white transition">
                {{ store.loading && step === 'dub' ? "Dubbing… this can take a while" : "🎭 AI Dub" }}
              </button>
            </template>
          </div>

          <p v-if="store.error" class="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {{ store.error }}
          </p>
          <p v-if="successMsg" class="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
            {{ successMsg }}
          </p>
        </div>

        <!-- Right: caption editor -->
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm text-gray-300">Caption Editor</h2>
            <button v-if="hasCaptions && captionsEdited"
              @click="handleSave"
              :disabled="!!store.loading"
              class="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg font-medium text-white transition">
              Save Changes
            </button>
          </div>

          <p v-if="!hasCaptions" class="text-gray-600 text-sm text-center my-auto">
            Generate captions to see them here.
          </p>

          <div v-else class="overflow-y-auto flex-1 space-y-2 max-h-[500px] pr-1">
            <div v-for="(cap, i) in editableCaptions" :key="i"
              class="bg-gray-800 rounded-xl p-3 space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs text-indigo-400">{{ fmtTime(cap.start) }} → {{ fmtTime(cap.end) }}</span>
                <input v-model="cap.speaker" placeholder="Speaker name"
                  class="ml-auto w-28 bg-gray-700 rounded-lg px-2 py-1 text-xs text-orange-300 font-semibold"
                  @input="captionsEdited = true" />
                <select v-model="cap.gender" class="bg-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                  @change="captionsEdited = true">
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <textarea v-model="cap.text" rows="2"
                class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                @input="captionsEdited = true" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <p v-else class="text-center text-gray-500 py-20">{{ store.error || "Video not found." }}</p>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useVideoStore } from "../stores/video.js";
import { useThemeStore } from "../stores/theme.js";
import LoadingSpinner from "../components/LoadingSpinner.vue";

const store = useVideoStore();
const theme = useThemeStore();
const route = useRoute();
const videoId = route.params.videoId;

const showDubbed = ref(false);
const targetLang = ref("");
const step = ref("");
const successMsg = ref("");
const captionsEdited = ref(false);
const editableCaptions = ref([]);

const activeVideoUrl = computed(() =>
  showDubbed.value
    ? store.currentVideo?.dubbedVideo?.url
    : store.currentVideo?.originalVideo?.url
);

// store.captions can be a truthy Caption document with an empty `captions`
// array — every gate below needs to check there's actually something in
// it, not just that the object exists (see backend/controllers/captionController.js).
const hasCaptions = computed(() => !!store.captions?.captions?.length);

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const statusClass = (s) => ({
  uploaded:    "bg-gray-700 text-gray-300",
  transcribed: "bg-blue-800 text-blue-300",
  dubbed:      "bg-green-800 text-green-300",
}[s] || "bg-gray-700 text-gray-300");

watch(() => store.captions, (val) => {
  if (val?.captions?.length) {
    editableCaptions.value = val.captions.map((c) => ({ ...c }));
    captionsEdited.value = false;
  } else {
    editableCaptions.value = [];
  }
}, { immediate: true });

const flash = (msg) => {
  successMsg.value = msg;
  setTimeout(() => { successMsg.value = ""; }, 4000);
};

const handleGenerate = async () => {
  step.value = "generate";
  const ok = await store.generateCaptions(videoId);
  if (ok) flash("Captions generated successfully!");
};

const handleTranslate = async () => {
  if (!targetLang.value) return;
  step.value = "translate";
  const ok = await store.translateCaptions(videoId, targetLang.value);
  if (ok) flash(`Translated to ${targetLang.value}!`);
};

const handleDub = async () => {
  step.value = "dub";
  const language = targetLang.value || null;
  const dubbed = await store.dubVideo(videoId, language);
  if (dubbed) {
    showDubbed.value = true;
    flash("Video dubbed successfully!");
  }
};

const handleSave = async () => {
  const ok = await store.updateCaptions(videoId, editableCaptions.value, targetLang.value || null);
  if (ok) { captionsEdited.value = false; flash("Captions saved!"); }
};

onMounted(async () => {
  await store.fetchVideo(videoId);
  if (!store.currentVideo) return; // fetchVideo already set store.error
  await store.fetchLanguages();
  await store.fetchCaptions(videoId);
});
</script>
