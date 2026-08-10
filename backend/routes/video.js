import express from "express";
import { uploadVideo, getUploadSignature, getVideo, listVideos, deleteVideo } from "../controllers/videoController.js";
import { identifyUser } from "../utils/ownership.js";

const router = express.Router();

router.route("/videos/upload-signature").get(identifyUser, getUploadSignature);
router.route("/videos").post(identifyUser, uploadVideo);
router.route("/videos").get(identifyUser, listVideos);
router.route("/videos/:videoId").get(identifyUser, getVideo);
router.route("/videos/:videoId").delete(identifyUser, deleteVideo);

export default router;
