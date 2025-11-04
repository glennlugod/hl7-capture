import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRPM } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { VitePlugin } from '@electron-forge/plugin-vite'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: "hl7-capture",
    icon: "./public/icon",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}),
    new MakerDeb({}),
    new MakerRPM({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.config.ts",
        },
        {
          entry: "src/preload/index.ts",
          config: "vite.config.ts",
        },
        {
          entry: "src/renderer/index.tsx",
          config: "vite.config.ts",
        },
      ],
      preload: {
        config: "vite.config.ts",
      },
    }),
  ],
};

export default config;
