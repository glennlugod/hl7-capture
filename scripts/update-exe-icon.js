// rcedit is an ESM module; dynamically import it within the async function
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "../out");
const iconPath = path.join(__dirname, "../public/img/icon.ico");

(async function () {
  const { rcedit } = await import("rcedit");
  if (!fs.existsSync(iconPath)) {
    console.warn("Icon not found:", iconPath);
    process.exit(0);
  }

  if (!fs.existsSync(root)) {
    console.warn("No out directory found:", root);
    process.exit(0);
  }

  const results = [];
  const resourceFiles = [];
  const exeNamesToPatch = new Set(["update.exe", "squirrel.exe", "setup.exe", "hl7-capture.exe"]);
  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const p = path.join(dir, f);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (path.extname(p).toLowerCase() === ".exe") {
        const lower = path.basename(p).toLowerCase();
        if (exeNamesToPatch.has(lower) || lower.endsWith("setup.exe")) results.push(p);
      } else if (path.basename(p).toLowerCase() === "app.ico") {
        resourceFiles.push(p);
      }
    }
  }
  walk(root);

  if (!results.length) {
    console.log("No Update.exe found under", root);
    process.exit(0);
  }

  for (const exePath of results) {
    try {
      console.log("Setting icon for", exePath);
      await rcedit(exePath, { icon: iconPath });
      console.log("Updated", exePath);
    } catch (err) {
      console.error("Failed to update", exePath, err);
    }
  }

  // Replace any app.ico found in resources with our custom app.ico
  for (const resPath of resourceFiles) {
    try {
      console.log("Replacing resource icon at", resPath);
      fs.copyFileSync(iconPath, resPath);
      console.log("Replaced", resPath);
    } catch (err) {
      console.error("Failed to replace resource icon at", resPath, err);
    }
  }
})();
