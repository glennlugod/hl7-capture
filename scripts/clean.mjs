#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(__filename, "..", "..");
const targets = [".vite", "dist", ".cache", "coverage", "out", ".parcel-cache", "build"];

function remove(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log("Removed directory:", targetPath);
    } else {
      fs.unlinkSync(targetPath);
      console.log("Removed file:", targetPath);
    }
  } catch (err) {
    console.error("Failed to remove", targetPath, err.message);
  }
}

console.log("Cleaning project build artifacts...");
for (const t of targets) {
  remove(path.join(root, t));
}

// remove node_modules/.cache if present
const nmCache = path.join(root, "node_modules", ".cache");
remove(nmCache);

console.log("Clean complete.");
