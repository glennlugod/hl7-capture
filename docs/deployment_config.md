# Deployment & Packaging — hl7-capture

This document summarizes build and packaging configuration and instructions.

## Packaging & Distribution

- The project uses `electron-forge` and `@electron-forge/plugin-vite` for builds and packaging. Configuration is in `forge.config.cjs`.
- Makers configured:
  - `@electron-forge/maker-squirrel` (Windows installer, Setup.exe) with `public/img/icon.ico` for Setup icons
  - `@electron-forge/maker-zip` (zip package)
  - `@electron-forge/maker-deb` & `@electron-forge/maker-rpm` for Linux distributions

## Build Targets

- Renderer: Vite builds `src/renderer` to `.vite/renderer` using `vite.config.ts`
- Main: Vite builds `src/main/index.ts` to `.vite/build/main.js` using `vite.main.config.ts` (CommonJS)
- Preload: Vite builds `src/preload/index.ts` to `.vite/build/preload.js` using `vite.preload.config.ts` (CommonJS)

## Build Commands

Development (hot reload):

```pwsh
npm run dev
```

Renderer-only dev (fast dev iterations):

```pwsh
npm run dev:renderer
```

Package for distribution (platform-specific):

```pwsh
npm run package
```

## Platform Notes & Native Dependencies

- Packet capture uses `dumpcap` and OS packet capture libraries. Npcap is required on Windows. A helper script `scripts/setup-npcap.js` attempts to copy Npcap DLLs to the `cap` module build directory when present.
- To test dumpcap locally, use the helper `.
un-dumpcap-dev.ps1 -Interface <index> -Filter "tcp"`.
- On Windows, elevate privileges as required for packet capture if Npcap or permissions need adjustments.

## Environment & Config Files

- Build settings and packaging options are in `forge.config.cjs`.
- Vite config files: `vite.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`.
- In production, build outputs are under `.vite/build` and `.vite/renderer`.

## Release Workflow Recommendations

1. Update `package.json` version and changelog
2. Run `npm run build` / `npm run package` locally or CI
3. Create distribution artifacts and sign them if required by platform policies
4. Validate installer (Squirrel/Zip/Deb/RPM) on target platforms

## Troubleshooting

- If `dumpcap` is missing, verify `PATH` or install Wireshark/dumpcap
- If capture fails due to permissions: run the app as Administrator on Windows
- If packaging fails: check `electron-rebuild` and `postinstall` which are required for native packages
