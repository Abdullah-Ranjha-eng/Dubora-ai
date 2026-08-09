import express from "express";
import { dubVideo } from "../controllers/dubController.js";
import { identifyUser } from "../utils/ownership.js";

const router = express.Router();

router.route("/videos/:videoId/dub").post(identifyUser, dubVideo);

export default router;
