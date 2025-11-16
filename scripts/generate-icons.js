const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico");
const pngToIcoFn = typeof pngToIco === "function" ? pngToIco : pngToIco.default;

(async function () {
  try {
    const iconPng = path.join(__dirname, "../public/img/icon.png");
    const iconIco = path.join(__dirname, "../public/img/icon.ico");

    if (!fs.existsSync(iconPng)) {
      console.error("Source icon not found at", iconPng);
      process.exit(1);
    }

    console.log("Generating multi-size .ico from", iconPng);
    const buf = await pngToIcoFn(iconPng);
    fs.writeFileSync(iconIco, buf);
    // Also write app.ico (used by Squirrel / Start Menu shortcuts) alongside icon.ico
    const appIco = path.join(__dirname, "../public/img/app.ico");
    fs.writeFileSync(appIco, buf);
    console.log("Generated", iconIco, "and", appIco);
  } catch (err) {
    console.error("Failed to generate icon.ico:", err);
    process.exit(1);
  }
})();
