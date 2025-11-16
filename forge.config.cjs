const MakerDeb = require("@electron-forge/maker-deb").default;
const MakerRPM = require("@electron-forge/maker-rpm").default;
const MakerSquirrel = require("@electron-forge/maker-squirrel").default;
const MakerZIP = require("@electron-forge/maker-zip").default;
const { VitePlugin } = require("@electron-forge/plugin-vite");

const pkg = require("./package.json");
const config = {
  packagerConfig: {
    asar: true,
    // Recommended: `name` without spaces for packaging artifacts and Squirrel IDs
    name: "hl7-capture",
    executableName: "hl7-capture",
    // For Windows packaging, Electron Packager expects the base path (no extension).
    // Ensure the .ico lives at public/img/icon.ico
    icon: "./public/img/icon",
    // Include the app.ico file from public/img as a resource so the installed app can
    // use it directly (Squirrel may extract a separate app.ico file during install).
    extraResource: ["public/img/app.ico"],
    // Friendly product name used by Windows shortcuts / installer
    appId: "com.hl7.capture",
    win32metadata: {
      ProductName: "HL7 Capture",
      CompanyName: "HL7 Capture",
      FileDescription: "Network HL7 capture and debugging tool",
      FileVersion: pkg.version,
      ProductVersion: pkg.version,
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // Use the same ICO for the Squirrel installer (Setup.exe)
      setupIcon: "./public/img/icon.ico",
      // Squirrel package ID cannot contain spaces; use short ID here
      name: "HL7Capture",
    }),
    new MakerZIP({}),
    new MakerDeb({}),
    new MakerRPM({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload/index.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.config.ts",
        },
      ],
    }),
  ],
};

module.exports = config;
