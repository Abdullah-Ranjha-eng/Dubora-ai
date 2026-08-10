import { defineStore } from "pinia";
import axios from "axios";
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

    // Uploads directly to Cloudinary from the browser (not through our own
    // API) — see backend/controllers/videoController.js getUploadSignature
    // for why: Vercel serverless functions cap request bodies at ~4.5MB,
    // so piping a real video file through the backend fails there even
    // though it works fine on a local Express server with no such limit.
    async startUpload(file, title) {
      this.loading = true;
      this.error = "";
      this.uploadProgress = 0;
      try {
        const { data: sig } = await api.get("/videos/upload-signature");

        const cloudForm = new FormData();
        cloudForm.append("file", file);
        cloudForm.append("api_key", sig.apiKey);
        cloudForm.append("timestamp", sig.timestamp);
        cloudForm.append("signature", sig.signature);
        cloudForm.append("folder", sig.folder);

        // A plain axios call (not the `api` instance) — this goes straight
        // to Cloudinary's own API, not our backend, so it shouldn't carry
        // our baseURL, guest-id header, or auth cookie.
        const { data: cloudResult } = await axios.post(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
          cloudForm,
          {
            onUploadProgress: (evt) => {
              this.uploadProgress = Math.round((evt.loaded / evt.total) * 100);
            },
          }
        );

        const { data } = await api.post("/videos", {
          public_id: cloudResult.public_id,
          url: cloudResult.secure_url,
          duration: cloudResult.duration, // Cloudinary returns this automatically for video uploads
          title,
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

    // Runs the full AI dub (see backend/utils/dubEngine.js). The backend
    // only queues this and returns immediately (dubbing takes real
    // minutes — see backend/models/dubJob.js for why it can't be a single
    // blocking request), so this polls a status endpoint until it's done.
    // Signature/behavior matches the old synchronous version on purpose —
    // still resolves to the dubbed video (or null on failure), still
    // updates `loading`/`currentVideo` — so nothing calling this needs to
    // change.
    async dubVideo(videoId, language = null) {
      this.loading = true;
      this.error = "";
      try {
        await api.post(`/videos/${videoId}/dub`, { language });

        const POLL_INTERVAL_MS = 4000;
        // No overall cap here on purpose — a long video's TTS+encode can
        // genuinely take several minutes on the worker. The user can
        // navigate away; refetching the video page re-polls from scratch.
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const { data: status } = await api.get(`/videos/${videoId}/dub-status`, {
            params: { language },
          });

          if (status.status === "done") {
            if (this.currentVideo) this.currentVideo.dubbedVideo = status.dubbedVideo;
            return status.dubbedVideo;
          }
          if (status.status === "failed") {
            this.error = status.error || "Dubbing failed.";
            return null;
          }
          // else "pending" / "processing" — keep polling
        }
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
