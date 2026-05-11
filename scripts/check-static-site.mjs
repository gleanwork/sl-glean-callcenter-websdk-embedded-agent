import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "site/index.html",
  "site/app.js",
  "site/styles.css",
  "README.md",
  "AGENTS.md",
  "SECURITY.md",
  "cdk.json",
  "lib/static-site-stack.ts",
];

for (const file of requiredFiles) {
  const path = join(root, file);
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${file}`);
  }

  if (!readFileSync(path, "utf8").trim()) {
    throw new Error(`Required file is empty: ${file}`);
  }
}

const indexHtml = readFileSync(join(root, "site/index.html"), "utf8");
const appJs = readFileSync(join(root, "site/app.js"), "utf8");

const requiredHtmlSnippets = [
  "./styles.css",
  "./app.js",
  "https://app.glean.com/embedded-search-latest.min.js",
  'id="toggle-agent"',
  "Glean Agent",
];

for (const snippet of requiredHtmlSnippets) {
  if (!indexHtml.includes(snippet)) {
    throw new Error(`site/index.html is missing required snippet: ${snippet}`);
  }
}

const forbiddenPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /aws_secret_access_key/i,
  /xox[baprs]-/i,
  /ghp_[A-Za-z0-9_]{30,}/,
  /GLEAN_API_KEY/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

for (const file of getRepositoryFiles()) {
  const fullPath = join(root, file);
  if (file === "scripts/check-static-site.mjs") {
    continue;
  }

  if (!isTextFile(fullPath)) {
    continue;
  }

  const contents = readFileSync(fullPath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(contents)) {
      throw new Error(`Potential secret-like value found in ${file}: ${pattern}`);
    }
  }
}

execFileSync(process.execPath, ["--check", join(root, "site/app.js")], {
  stdio: "inherit",
});

console.log("Static site validation passed.");

function getRepositoryFiles() {
  try {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean)
      .filter((file) => !file.startsWith("node_modules/"))
      .filter((file) => !file.startsWith("cdk.out/"));
  } catch (_error) {
    return requiredFiles;
  }
}

function isTextFile(path) {
  if (statSync(path).size > 1_000_000) {
    return false;
  }

  const buffer = readFileSync(path);
  return !buffer.includes(0);
}
