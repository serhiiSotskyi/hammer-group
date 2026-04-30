import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredExcludes = [
  "/api/*",
  "/assets/*",
  "/uploads/*",
  "*.css",
  "*.js",
  "*.mjs",
  "*.map",
  "*.json",
  "*.ico",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.svg",
  "*.webp",
  "*.woff",
  "*.woff2",
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(scriptDir, "../staticwebapp.config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

const errors = [];

if (config.responseOverrides?.["404"]) {
  errors.push("Remove responseOverrides.404 so Azure does not mask missing assets or API routes with index.html.");
}

if (config.navigationFallback?.rewrite !== "/index.html") {
  errors.push('navigationFallback.rewrite must remain "/index.html" for SPA routes.');
}

const excludes = config.navigationFallback?.exclude;
if (!Array.isArray(excludes)) {
  errors.push("navigationFallback.exclude must be an array.");
} else {
  const missing = requiredExcludes.filter((entry) => !excludes.includes(entry));
  if (missing.length > 0) {
    errors.push(`navigationFallback.exclude is missing: ${missing.join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error(`Invalid Azure Static Web Apps config: ${configPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Azure Static Web Apps config is safe for assets and API fallback.");
