import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { uploadVideo, getVideo, listVideos, deleteVideo } from "../controllers/videoController.js";
import { identifyUser } from "../utils/ownership.js";

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB

const router = express.Router();

router.route("/videos").post(identifyUser, upload.single("video"), uploadVideo);
router.route("/videos").get(identifyUser, listVideos);
router.route("/videos/:videoId").get(identifyUser, getVideo);
router.route("/videos/:videoId").delete(identifyUser, deleteVideo);

export default router;
