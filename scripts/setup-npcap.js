const fs = require("fs");
const path = require("path");

const npcapPath = "C:\\Windows\\System32\\Npcap";
const targetPath = path.join(__dirname, "..", "node_modules", "cap", "build", "Release");

console.log("Setting up Npcap for cap module...");

// Check if Npcap DLLs exist
if (!fs.existsSync(npcapPath)) {
  console.error("ERROR: Npcap DLLs not found at:", npcapPath);
  console.error("Please install Npcap from: https://npcap.com/#download");
  console.error('Make sure to install with "WinPcap API-compatible Mode" enabled.');
  process.exit(1);
}

// Check if cap module is installed
if (!fs.existsSync(targetPath)) {
  console.warn(
    "WARNING: cap module build directory not found. This is normal during initial install."
  );
  console.warn("The script will run again after dependencies are installed.");
  process.exit(0);
}

try {
  // Copy Npcap DLLs to cap build directory
  const files = fs.readdirSync(npcapPath);
  const dllFiles = files.filter((file) => file.toLowerCase().endsWith(".dll"));

  if (dllFiles.length === 0) {
    console.error("ERROR: No DLL files found in Npcap directory");
    process.exit(1);
  }

  console.log(`Found ${dllFiles.length} DLL file(s) in Npcap directory`);

  dllFiles.forEach((file) => {
    const source = path.join(npcapPath, file);
    const dest = path.join(targetPath, file);
    fs.copyFileSync(source, dest);
    console.log(`Copied: ${file}`);
  });

  console.log("Npcap setup completed successfully!");
} catch (error) {
  console.error("ERROR: Failed to copy Npcap DLLs:", error.message);
  process.exit(1);
}
