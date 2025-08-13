import fs from "fs";

console.log("[SHIP] Preflight starting…");

// Ensure /k/.tmp exists for Git Bash
const tmpDir = "/k/.tmp";
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  process.env.TMPDIR = tmpDir;
  console.log(`[SHIP] TMPDIR set to ${tmpDir}`);
} catch (err) {
  console.error("[SHIP] Failed to create tmp dir:", err);
  process.exit(1);
}

// Check Node version
const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  console.error("[SHIP] ❌ Node 18+ required. Found:", process.versions.node);
  process.exit(1);
}
console.log(`[SHIP] Node version OK (${process.versions.node})`);

console.log("[SHIP] Preflight complete — ready to ship.");