const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

function bumpVersion(version) {
  // preserve pre-release (+build) suffixes; only increment the last numeric portion of the core version
  const plusIndex = version.indexOf("+");
  const plus = plusIndex >= 0 ? version.slice(plusIndex) : "";
  const beforePlus = plusIndex >= 0 ? version.slice(0, plusIndex) : version;

  const dashIndex = beforePlus.indexOf("-");
  const pre = dashIndex >= 0 ? beforePlus.slice(dashIndex) : "";
  const core = dashIndex >= 0 ? beforePlus.slice(0, dashIndex) : beforePlus;

  const parts = core.split(".");
  if (parts.length === 0) throw new Error("Invalid version");
  const lastIdx = parts.length - 1;
  const n = parseInt(parts[lastIdx], 10);
  if (Number.isNaN(n)) throw new Error("Last version segment is not a number");
  parts[lastIdx] = String(n + 1);
  return parts.join(".") + pre + plus;
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const defaultShell = process.platform === "win32";
    const ps = spawn(cmd, args, { stdio: "inherit", shell: opts.shell ?? defaultShell, ...opts });
    ps.on("error", (err) => reject(err));
    ps.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))
    );
  });
}

async function main() {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const oldVersion = String(pkg.version || "0.0.0");
  const newVersion = bumpVersion(oldVersion);

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log(`Bumped version: ${oldVersion} -> ${newVersion}`);
  try {
    // Install dependencies after the version bump so lockfile / node_modules stay in sync
    console.log("Running: npm install");
    await runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["install"]);
  } catch (err) {
    console.error("npm install failed:", err.message || err);
    process.exit(1);
  }

  try {
    // Run electron-forge make via npx to ensure using local installation
    console.log("Running: npx electron-forge make");
    await runCommand(process.platform === "win32" ? "npx.cmd" : "npx", ["electron-forge", "make"]);
  } catch (err) {
    console.error("electron-forge make failed:", err.message || err);
    process.exit(1);
  }

  try {
    // Commit all changes, tag, and push
    spawnSync("git", ["add", "-A"], { stdio: "inherit" });
    const commitMsg = `chore(release): v${newVersion}`;
    // If there's nothing to commit, allow this to continue (exit code 0 or non-zero depending on git config). We'll attempt commit and ignore failure if no changes.
    try {
      spawnSync("git", ["commit", "-m", commitMsg], { stdio: "inherit" });
    } catch {
      // commit may fail if no changes; continue
    }
    const tagName = `v${newVersion}`;
    spawnSync("git", ["tag", tagName], { stdio: "inherit" });
    spawnSync("git", ["push"], { stdio: "inherit" });
    spawnSync("git", ["push", "--tags"], { stdio: "inherit" });
    console.log(`Committed and pushed changes, created tag ${tagName}`);
  } catch (err) {
    console.error("Git operations failed:", err.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
