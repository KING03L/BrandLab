// scripts/ship-git.mjs
import { execSync } from "child_process";
import fs from "fs";

function run(cmd) {
  return execSync(cmd, { stdio: "inherit" });
}
function get(cmd) {
  return execSync(cmd, { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
}

console.log("[SHIP] Git check…");

try {
  get("git rev-parse --is-inside-work-tree");
} catch {
  console.error("[SHIP] ❌ Not a git repository.");
  process.exit(1);
}

const branch = get("git rev-parse --abbrev-ref HEAD");
console.log(`[SHIP] On branch: ${branch}`);

if (get("git status --porcelain")) {
  console.log("[SHIP] Committing changes…");
  run("git add -A");
  const tagTime = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  run(`git commit -m "Auto-commit: Ship ${tagTime}"`);
  run(`git push origin ${branch}`);
} else {
  console.log("[SHIP] No changes to commit.");
}

const commitHash = get("git rev-parse HEAD");
const tagName = `release-${new Date().toISOString().replace(/[:T]/g, "-").split(".")[0]}`;
run(`git tag -a ${tagName} -m "Automated ship release ${tagName}"`);
run("git push --tags");

fs.writeFileSync(
  ".ship-meta.json",
  JSON.stringify({ tag: tagName, commit: commitHash }, null, 2)
);

console.log("[SHIP] Git tagging complete:", tagName);