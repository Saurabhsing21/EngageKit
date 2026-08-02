#!/usr/bin/env bash
# Package EngageKit for Chrome Web Store upload.
# Output: dist/engagekit-<version>.zip with manifest.json at ZIP root.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/extension"
DIST="$ROOT/dist"
MANIFEST="$EXT/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Missing manifest: $MANIFEST" >&2
  exit 1
fi

VERSION="$(python3 -c "import json; print(json.load(open('$MANIFEST'))['version'])")"
ZIP_NAME="engagekit-${VERSION}.zip"
OUT_ZIP="$DIST/$ZIP_NAME"

mkdir -p "$DIST"
rm -f "$OUT_ZIP"

# Stage only store-shipped files (no tests, no node_modules, no README noise)
STAGE="$(mktemp -d)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$STAGE"

copy_if_exists() {
  local rel="$1"
  if [[ -e "$EXT/$rel" ]]; then
    mkdir -p "$STAGE/$(dirname "$rel")"
    cp -R "$EXT/$rel" "$STAGE/$rel"
  fi
}

# Core extension files
for f in \
  manifest.json \
  background.js \
  content.js \
  content.css \
  selectors.js \
  sidepanel.html \
  sidepanel.js \
  sidepanel.css \
  popup.html \
  popup.js \
  popup.css
do
  copy_if_exists "$f"
done

# Libraries + icons
cp -R "$EXT/lib" "$STAGE/lib"
cp -R "$EXT/icons" "$STAGE/icons"

# Sanity: manifest at root of stage
if [[ ! -f "$STAGE/manifest.json" ]]; then
  echo "Packaging failed: manifest.json missing from stage" >&2
  exit 1
fi

# Fail if secrets accidentally present (ignore UI placeholders like "sk-or-…")
if grep -R -n -E 'sk-or-[a-zA-Z0-9]{10,}|OPENROUTER_API_KEY\s*=\s*[^\s"]+' "$STAGE" >/dev/null 2>&1; then
  echo "Refusing to package: possible API key found in staged files" >&2
  grep -R -n -E 'sk-or-[a-zA-Z0-9]{10,}|OPENROUTER_API_KEY\s*=\s*[^\s"]+' "$STAGE" >&2 || true
  exit 1
fi

(
  cd "$STAGE"
  zip -r "$OUT_ZIP" . -x "*.DS_Store" -x "**/.DS_Store" >/dev/null
)

echo "Created $OUT_ZIP"
echo "Size: $(du -h "$OUT_ZIP" | awk '{print $1}')"
unzip -l "$OUT_ZIP" | head -n 40
echo "..."
echo "Upload this ZIP at: https://chrome.google.com/webstore/devconsole"
