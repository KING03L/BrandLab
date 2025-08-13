// scripts/ship-openurl.mjs
import { execSync } from "child_process";

const url = `https://<your-firebase-project>.web.app`;
console.log(`[SHIP] Opening ${url} in browser…`);

try {
  if (process.platform === "win32") {
    execSync(`start ${url}`);
  } else if (process.platform === "darwin") {
    execSync(`open ${url}`);
  } else {
    execSync(`xdg-open ${url}`);
  }
} catch {
  console.error("[SHIP] Failed to open browser automatically.");
}