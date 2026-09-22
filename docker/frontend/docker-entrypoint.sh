#!/bin/sh
# Inyección en runtime: reemplaza los placeholders compilados en environment.prod.ts
#   __PARKY_API_URL__ -> $API_URL (ej. http://localhost:3000/api)
#   __PARKY_APP_URL__ -> $APP_URL (ej. http://localhost:8080)
# Así la MISMA imagen sirve para local, QA, prod y AKS sin reconstruir.
set -eu

API_URL="${API_URL:-http://localhost:3000/api}"
APP_URL="${APP_URL:-http://localhost:8080}"
HTML_ROOT="/usr/share/nginx/html"

echo "🌐 Frontend runtime: API_URL=${API_URL} APP_URL=${APP_URL}"

# Reemplazar en todos los bundles JS (main.*.js, chunk-*.js, etc.)
# shellcheck disable=SC2016
grep -rl "__PARKY_API_URL__" "$HTML_ROOT" 2>/dev/null | while read -r f; do
  sed -i "s|__PARKY_API_URL__|${API_URL}|g" "$f"
  echo "  ✏️  API_URL inyectada en: $f"
done
grep -rl "__PARKY_APP_URL__" "$HTML_ROOT" 2>/dev/null | while read -r f; do
  sed -i "s|__PARKY_APP_URL__|${APP_URL}|g" "$f"
  echo "  ✏️  APP_URL inyectada en: $f"
done

# Verificación: si quedó algún placeholder, avisar (no tumbar nginx en local)
if grep -rq "__PARKY_" "$HTML_ROOT" 2>/dev/null; then
  echo "⚠️  Quedaron placeholders __PARKY_* sin reemplazar. Revisa API_URL/APP_URL."
  grep -r "__PARKY_" "$HTML_ROOT" | head -5 || true
else
  echo "✅ Placeholders reemplazados correctamente."
fi

exec "$@"
