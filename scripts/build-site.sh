#!/usr/bin/env bash
# Builds the combined Hammer Group static site:
#   /            -> new public site (apps/redesign-lab)
#   /admin, /admin/*  -> existing admin SPA (apps/frontend), served from /admin-app/
#
# Usage: scripts/build-site.sh <staging|production>
# Output: apps/redesign-lab/dist (deploy this folder with skip_app_build: true)
#
# Dependencies must already be installed (npm ci) in apps/redesign-lab and apps/frontend.
# Env:
#   VITE_API_ORIGIN  backend origin baked into both apps (default: live backend)
#   VITE_SITE_URL    optional, passed through to the admin/old-site build (same as live workflow: unset)
set -euo pipefail

SITE_ENV="${1:-}"
if [ "$SITE_ENV" != "staging" ] && [ "$SITE_ENV" != "production" ]; then
  echo "usage: $0 <staging|production>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REDESIGN="$ROOT/apps/redesign-lab"
FRONTEND="$ROOT/apps/frontend"
DIST="$REDESIGN/dist"
ADMIN_BASE="/admin-app/"
ADMIN_DIR="$DIST/admin-app"

export VITE_API_ORIGIN="${VITE_API_ORIGIN:-https://hg-backend-d3habycebefnf8ex.polandcentral-01.azurewebsites.net}"

echo "==> [$SITE_ENV] building new public site (apps/redesign-lab)"
(cd "$REDESIGN" && npm run build)

echo "==> [$SITE_ENV] building admin SPA (apps/frontend) with base $ADMIN_BASE"
# vite build only: the frontend's tsc has known pre-existing errors, and its
# generate-seo-pages step prerenders the old public pages, which must not ship.
(cd "$FRONTEND" && npx vite build --base="$ADMIN_BASE" --outDir dist-admin --emptyOutDir)

rm -rf "$ADMIN_DIR"
cp -R "$FRONTEND/dist-admin" "$ADMIN_DIR"
rm -rf "$FRONTEND/dist-admin"

# Public files of the old site that only make sense at the root, not under /admin-app/.
rm -f "$ADMIN_DIR/robots.txt" "$ADMIN_DIR/sitemap.xml" "$ADMIN_DIR"/google*.html

# Absolute public files the admin/old-site code references at the root
# ("/placeholder.svg", "/HammerB.svg", "/favicon.ico"), plus the Google Search Console
# verification file and the sitemap. Never overwrite a file the redesign already ships.
for f in HammerB.svg placeholder.svg favicon.ico sitemap.xml "$(cd "$FRONTEND/public" && ls google*.html 2>/dev/null || true)"; do
  [ -n "$f" ] || continue
  [ -f "$FRONTEND/public/$f" ] || continue
  if [ -e "$DIST/$f" ]; then
    echo "    keep redesign's own /$f"
  else
    cp "$FRONTEND/public/$f" "$DIST/$f"
    echo "    copied /$f from apps/frontend/public"
  fi
done

echo "==> [$SITE_ENV] writing robots.txt and staticwebapp.config.json"
if [ "$SITE_ENV" = "production" ]; then
  cp "$FRONTEND/public/robots.txt" "$DIST/robots.txt"
  # The redesign's index.html carries <meta name="robots" content="noindex, nofollow"> for staging.
  node -e '
    const fs = require("fs"); const p = process.argv[1];
    const html = fs.readFileSync(p, "utf8");
    const out = html.replace(/\s*<meta\s+name="robots"\s+content="noindex[^"]*"\s*\/?>/i, "");
    if (out !== html) { fs.writeFileSync(p, out); console.log("    removed noindex meta from /index.html"); }
  ' "$DIST/index.html"
  GLOBAL_ROBOTS=""
else
  printf 'User-agent: *\nDisallow: /\n' > "$DIST/robots.txt"
  GLOBAL_ROBOTS=$'\n    "X-Robots-Tag": "noindex, nofollow",'
fi

cat > "$DIST/staticwebapp.config.json" <<EOF
{
  "routes": [
    { "route": "/doors", "redirect": "/interior-doors/", "statusCode": 301 },
    { "route": "/admin", "rewrite": "/admin-app/index.html", "headers": { "Cache-Control": "no-cache", "X-Robots-Tag": "noindex, nofollow" } },
    { "route": "/admin/*", "rewrite": "/admin-app/index.html", "headers": { "Cache-Control": "no-cache", "X-Robots-Tag": "noindex, nofollow" } },
    { "route": "/admin-app/assets/*", "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "route": "/admin-app/*", "headers": { "Cache-Control": "no-cache", "X-Robots-Tag": "noindex, nofollow" } },
    { "route": "/assets/*", "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "route": "/img/*", "headers": { "Cache-Control": "public, max-age=86400" } }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": [
      "/assets/*",
      "/admin-app/*",
      "/img/*",
      "/api/*",
      "/uploads/*",
      "*.{css,js,mjs,map,json,ico,png,jpg,jpeg,gif,svg,webp,woff,woff2,txt,xml}",
      "/googleeb4a39ce0ed7b1ae.html"
    ]
  },
  "globalHeaders": {${GLOBAL_ROBOTS}
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache"
  }
}
EOF
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$DIST/staticwebapp.config.json"

test -f "$DIST/index.html"
test -f "$ADMIN_DIR/index.html"
grep -q 'src="/admin-app/assets/' "$ADMIN_DIR/index.html" || { echo "admin index.html does not reference /admin-app/assets/" >&2; exit 1; }

echo "==> [$SITE_ENV] done: $DIST"
