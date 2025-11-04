const MakerDeb = require("@electron-forge/maker-deb").default;
const MakerRPM = require("@electron-forge/maker-rpm").default;
const MakerSquirrel = require("@electron-forge/maker-squirrel").default;
const MakerZIP = require("@electron-forge/maker-zip").default;
const { VitePlugin } = require("@electron-forge/plugin-vite");

const config = {
  packagerConfig: {
    asar: true,
    executableName: "hl7-capture",
    icon: "./public/icon",
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}), new MakerDeb({}), new MakerRPM({})],
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
          entry: "public/index.html",
        },
      ],
    }),
  ],
};

module.exports = config;
