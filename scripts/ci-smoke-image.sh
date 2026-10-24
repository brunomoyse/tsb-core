#!/usr/bin/env bash
# Boot smoke test of a built frontend image, run by CI before the image is
# pushed. It needs a Docker daemon able to run the image's platform, nothing
# else (no secret, no backend):
#
#   scripts/ci-smoke-image.sh <image>
#
# Starts the container as production does and waits until the Nitro server
# answers. Two checks, both run inside the container with its own busybox wget
# (the tool the image HEALTHCHECK uses):
#   1. /robots.txt, a server route that never calls the API: the server booted.
#   2. SMOKE_PATH (default "/", the HEALTHCHECK path, redirects followed): the
#      page is server-rendered (the HTML carries the __NUXT_DATA__ payload), so
#      the SSR bundle is intact, not just the HTTP listener.
# The API is not reachable from the runner, so the page must render without it
# (a request that fails server-side degrades, it must not crash the render).
set -euo pipefail

image="${1:?usage: ci-smoke-image.sh <image>}"
path="${SMOKE_PATH:-/}"
timeout_s="${SMOKE_TIMEOUT:-90}"
port="${SMOKE_PORT:-3000}"
name="smoke-$$-$RANDOM"

cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ] && docker inspect "$name" >/dev/null 2>&1; then
    echo "::group::logs of $name"
    docker logs "$name" 2>&1 | tail -n 80 || true
    echo "::endgroup::"
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  exit "$rc"
}
trap cleanup EXIT

docker run -d --name "$name" "$image" >/dev/null

probe() {
  docker exec "$name" wget -qO- "http://127.0.0.1:$port$1"
}

deadline=$((SECONDS + timeout_s))
until probe /robots.txt >/dev/null 2>&1; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null)" != "true" ]; then
    echo "::error::the container exited before answering"
    exit 1
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "::error::no answer on /robots.txt after ${timeout_s}s"
    exit 1
  fi
  sleep 1
done
echo "GET /robots.txt answered."

if ! probe "$path" | grep -q '__NUXT_DATA__'; then
  echo "::error::GET $path did not return a server-rendered page"
  exit 1
fi
echo "GET $path rendered a page."
echo "Smoke test passed for $image."
