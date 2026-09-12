#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo " NetworkPeer CI: Model Identifier Leakage Guardrail (§20.3, §26.3)"
echo "================================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEAK_FOUND=0

PATTERNS=(
  "Qwen"
  "Qwen-3-8B"
  "Qwen 3-8B"
  "3-8B Devanagari OCR"
  "Qwen-3-8B-Devanagari-OCR"
)

CLIENT_DIRS=(
  "$ROOT_DIR/apps/web/src"
  "$ROOT_DIR/apps/android/app/src/main/java"
  "$ROOT_DIR/apps/android/app/src/main/res"
)

for PATTERN in "${PATTERNS[@]}"; do
  for DIR in "${CLIENT_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
      MATCHES=$(grep -rIn --exclude="*.d.ts" "$PATTERN" "$DIR" || true)
      if [ -n "$MATCHES" ]; then
        echo "❌ [VIOLATION] Prohibited model identifier '$PATTERN' detected in client surface ($DIR):"
        echo "$MATCHES"
        LEAK_FOUND=1
      fi
    fi
  done
done

if [ "$LEAK_FOUND" -eq 1 ]; then
  echo ""
  echo "🚨 BUILD FAILED: Model name leaked into client-facing surfaces. See §20.3 & §26.3."
  exit 1
fi

echo "✅ SUCCESS: All client surfaces clean. Zero model identifier leakage detected."
exit 0
