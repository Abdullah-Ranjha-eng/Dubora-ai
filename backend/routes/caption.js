import express from "express";
import {
  generateCaptions,
  getVideoCaptions,
  updateCaptions,
  deleteCaptions,
} from "../controllers/captionController.js";
import { translateCaptions, getSupportedLanguages } from "../controllers/translateController.js";
import { identifyUser } from "../utils/ownership.js";

const router = express.Router();

router.route("/languages").get(getSupportedLanguages);

router.route("/videos/:videoId/captions/generate").post(identifyUser, generateCaptions);
router.route("/videos/:videoId/captions").get(identifyUser, getVideoCaptions);
router.route("/videos/:videoId/captions").put(identifyUser, updateCaptions);
router.route("/videos/:videoId/captions").delete(identifyUser, deleteCaptions);
router.route("/videos/:videoId/captions/translate").post(identifyUser, translateCaptions);

export default router;
