// scripts/ship-changelog.mjs
import fs from "fs";

const meta = fs.existsSync(".ship-meta.json")
  ? JSON.parse(fs.readFileSync(".ship-meta.json", "utf8"))
  : { tag: "unknown", commit: "unknown" };

fs.mkdirSync("public", { recursive: true });

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>BrandLab Deploy Changelog</title></head>
<body>
<h1>BrandLab Deploy Changelog</h1>
<p>Tag: ${meta.tag}</p>
<p>Commit: ${meta.commit}</p>
<p>Deployed at: ${new Date().toISOString()}</p>
</body>
</html>
`;

fs.writeFileSync("public/deploy-changelog.html", html);
console.log("[SHIP] Changelog updated.");