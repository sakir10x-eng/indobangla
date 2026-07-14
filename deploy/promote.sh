#!/bin/sh
# Promote the images you tested on staging to live — without rebuilding them.
#
#   sh promote.sh            # promote all three
#   sh promote.sh shop       # promote just the shop
#
# Rebuilding for live would be a different image: yarn/composer resolve fresh versions, and
# the Next bundle bakes in the site URL. Re-tagging the *tested* image is the only way to be
# sure that what went live is what you signed off on.
#
# Note the shop and admin images are built with SITE_URL baked in, so a staging shop image
# cannot serve live. Those two are rebuilt for live from the same commit; only the API image
# is byte-for-byte promoted. The commit is what is held constant — see release.sh.
set -e
cd "$(dirname "$0")"

SERVICES="${*:-api admin shop}"
SHA=$(git -C .. rev-parse --short HEAD 2>/dev/null || echo unknown)

echo "==> promoting [$SERVICES] from staging, commit $SHA"

# Snapshot what is live right now, so a rollback is one command.
for s in $SERVICES; do
  if docker image inspect "indobangla-$s:latest" >/dev/null 2>&1; then
    docker tag "indobangla-$s:latest" "indobangla-$s:previous"
    echo "    saved current live image  -> indobangla-$s:previous"
  fi
done

for s in $SERVICES; do
  case "$s" in
    api)
      # Same image, no rebuild: the API has no build-time URL baked into it.
      docker tag indobangla-api:staging "indobangla-api:latest"
      docker tag indobangla-api:staging "indobangla-api:$SHA"
      echo "    api    <- indobangla-api:staging (promoted as-is)"
      ;;
    shop|admin)
      # These bake SITE_URL at build time, so they must be built for the live hostname —
      # but from the exact commit that passed on staging.
      docker compose build "$s"
      docker tag "indobangla-$s:latest" "indobangla-$s:$SHA"
      echo "    $s  <- rebuilt from commit $SHA for the live hostname"
      ;;
  esac
done

docker compose up -d $SERVICES
echo "==> live now runs commit $SHA"
echo "    rollback:  sh rollback.sh $SERVICES"
