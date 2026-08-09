import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "../uploads");
export const VIDEOS_DIR = path.join(UPLOADS_ROOT, "videos");

for (const dir of [UPLOADS_ROOT, VIDEOS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const localPathFor = (dir, filename) => path.join(dir, filename);

// Never throws — cleanup is best-effort everywhere it's called.
export const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};
