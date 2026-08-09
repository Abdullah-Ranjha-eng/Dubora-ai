import { defineStore } from "pinia";
import api from "../api.js";

export const useVideoStore = defineStore("video", {
  state: () => ({
    videos: [],
    currentVideo: null,
    captions: null,
    languages: [],
    loading: false,
    error: "",
    uploadProgress: 0,
  }),

  actions: {
    async fetchVideos() {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await api.get("/videos");
        this.videos = data.videos;
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to load your videos.";
      } finally {
        this.loading = false;
      }
    },

    async fetchVideo(videoId) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await api.get(`/videos/${videoId}`);
        this.currentVideo = data.video;
      } catch (e) {
        this.currentVideo = null;
        this.error = e.response?.data?.message || "Failed to load this video.";
      } finally {
        this.loading = false;
      }
    },

    async fetchCaptions(videoId, language) {
      try {
        const { data } = await api.get(`/videos/${videoId}/captions`, {
          params: { language: language || undefined },
        });
        this.captions = data.captions;
      } catch (e) {
        if (e.response?.status !== 404) throw e;
        this.captions = null;
      }
    },

    async fetchLanguages() {
      try {
        const { data } = await api.get("/languages");
        this.languages = data.languages;
      } catch {
        this.languages = [];
      }
    },

    // Uploads the file and creates the video record. The caller navigates
    // to the video page once this resolves with the created video.
    async startUpload(file, title) {
      this.loading = true;
      this.error = "";
      this.uploadProgress = 0;
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title);
      try {
        const { data } = await api.post("/videos", formData, {
          onUploadProgress: (evt) => {
            this.uploadProgress = Math.round((evt.loaded / evt.total) * 100);
          },
        });
        this.currentVideo = data.video;
        return data.video;
      } catch (e) {
        this.error = e.response?.data?.message || "Upload failed.";
        return null;
      } finally {
        this.loading = false;
      }
    },

    async generateCaptions(videoId) {
      this.loading = true;
      this.error = "";
      try {
        await api.post(`/videos/${videoId}/captions/generate`);
        await this.fetchCaptions(videoId);
        await this.fetchVideo(videoId);
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to generate captions.";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async translateCaptions(videoId, language) {
      this.loading = true;
      this.error = "";
      try {
        await api.post(`/videos/${videoId}/captions/translate`, { language });
        await this.fetchCaptions(videoId, language);
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Translation failed.";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async updateCaptions(videoId, captions, language = null) {
      this.loading = true;
      this.error = "";
      try {
        await api.put(`/videos/${videoId}/captions`, { captions, language });
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to save edits.";
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Runs the full AI dub (see backend/utils/dubEngine.js) — this request
    // blocks until it's done, same as DubVerse's original Editor.vue.
    async dubVideo(videoId, language = null) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await api.post(`/videos/${videoId}/dub`, { language });
        if (this.currentVideo) this.currentVideo.dubbedVideo = data.dubbedVideo;
        return data.dubbedVideo;
      } catch (e) {
        this.error = e.response?.data?.message || "Dubbing failed.";
        return null;
      } finally {
        this.loading = false;
      }
    },

    async deleteVideo(videoId) {
      try {
        await api.delete(`/videos/${videoId}`);
        this.videos = this.videos.filter((v) => v._id !== videoId);
        return true;
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to delete video.";
        return false;
      }
    },
  },
});
