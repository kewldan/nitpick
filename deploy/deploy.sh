#!/usr/bin/env bash
# Installed on the server as /usr/local/bin/nitpick-deploy and bound to the
# GitHub Actions key in authorized_keys:
#   restrict,command="/usr/local/bin/nitpick-deploy" ssh-ed25519 AAAA… nitpick-deploy
# That key can do exactly one thing: "deploy <commit sha>", with a GHCR read
# token on stdin. It fetches that commit's compose file, pulls the image built
# from it and restarts the app.
set -euo pipefail

REPO=kewldan/nitpick
DIR=/root/nitpick

if [[ ! "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo "usage: deploy <40-char commit sha>" >&2
  exit 64
fi
tag="${BASH_REMATCH[1]}"
token="$(head -c 4096)"

mkdir -p "$DIR"
cd "$DIR"

curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/$REPO/$tag/deploy/docker-compose.yml" \
  -o docker-compose.yml.new
mv docker-compose.yml.new docker-compose.yml
printf 'IMAGE_TAG=%s\n' "$tag" > .env

# A throwaway Docker config, so the token never lands in root's config.
export DOCKER_CONFIG
DOCKER_CONFIG="$(mktemp -d)"
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
printf '%s' "$token" | docker login ghcr.io -u "${REPO%%/*}" --password-stdin >/dev/null

docker compose pull --quiet
docker compose up -d --remove-orphans
docker image prune -af \
  --filter "label=org.opencontainers.image.source=https://github.com/$REPO" >/dev/null || true

for _ in $(seq 1 40); do
  status="$(docker inspect -f '{{.State.Health.Status}}' nitpick-app-1 2>/dev/null || echo missing)"
  if [[ "$status" == healthy ]]; then
    echo "deployed $tag"
    exit 0
  fi
  sleep 2
done
echo "app did not become healthy (status: $status)" >&2
docker compose logs --tail 60 app >&2
exit 1
