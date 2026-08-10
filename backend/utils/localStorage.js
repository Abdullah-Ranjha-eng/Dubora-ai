import fs from "fs";
import path from "path";
import os from "os";

// os.tmpdir() instead of a path relative to this file: on Vercel, the
// deployed project directory is READ-ONLY — only /tmp is writable, and
// os.tmpdir() resolves to /tmp there automatically. A project-relative
// folder here would throw on fs.mkdirSync at module load time, on EVERY
// cold start, before any request could even be handled. This also works
// identically for local dev (os.tmpdir() resolves to a normal temp folder
// on Windows/Mac/Linux), so there's no environment-specific branching
// needed. Note: on Vercel this directory does NOT persist reliably across
// separate invocations (different requests may hit different containers)
// — that's fine, it degrades gracefully to "always re-download from
// Cloudinary" via the fallback in utils/dubEngine.js's getLocalOriginalPath.
const UPLOADS_ROOT = path.join(os.tmpdir(), "dubverse-uploads");
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
