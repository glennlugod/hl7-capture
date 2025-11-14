const MakerDeb = require("@electron-forge/maker-deb").default;
const MakerRPM = require("@electron-forge/maker-rpm").default;
const MakerSquirrel = require("@electron-forge/maker-squirrel").default;
const MakerZIP = require("@electron-forge/maker-zip").default;
const { VitePlugin } = require("@electron-forge/plugin-vite");

const config = {
  packagerConfig: {
    asar: true,
    executableName: "hl7-capture",
    // For Windows packaging, Electron Packager expects the base path (no extension).
    // Ensure the .ico lives at public/img/icon.ico
    icon: "./public/img/icon",
    // Friendly product name used by Windows shortcuts / installer
    win32metadata: {
      ProductName: "HL7 Capture",
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // Use the same ICO for the Squirrel installer (Setup.exe)
      setupIcon: "./public/img/icon.ico",
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
