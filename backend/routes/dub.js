import express from "express";
import { dubVideo, getDubStatus } from "../controllers/dubController.js";
import { identifyUser } from "../utils/ownership.js";

const router = express.Router();

router.route("/videos/:videoId/dub").post(identifyUser, dubVideo);
router.route("/videos/:videoId/dub-status").get(identifyUser, getDubStatus);

export default router;
