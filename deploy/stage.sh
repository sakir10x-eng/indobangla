#!/bin/sh
# Build the current code onto staging — https://staging.indobangla.tech
#
#   sh stage.sh            # everything
#   sh stage.sh sshop      # just the shop
#
# Order matters. Next.js fetches from the API *during* the static build, so the staging API
# has to be answering on its public URL before the shop is built — otherwise the build dies
# with `getaddrinfo ENOTFOUND staging.indobangla.tech`. This script enforces that order.
set -e
cd "$(dirname "$0")"

C="docker compose -f docker-compose.staging.yml"
SERVICES="${*:-sapi sadmin sshop}"

echo "==> staging: $SERVICES"
$C up -d db redis

# API first, and make sure it actually answers before anything is built against it.
case " $SERVICES " in *" sapi "*)
  $C build sapi
  $C up -d sapi web
  echo "==> waiting for https://staging.indobangla.tech/backend to answer"
  i=0
  until [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://staging.indobangla.tech/backend/types)" = "200" ]; do
    i=$((i+1)); [ $i -gt 20 ] && { echo "!! staging API never came up — not building the shop"; exit 1; }
    sleep 10
  done
  echo "    API is up"
esac

for s in $SERVICES; do
  case "$s" in sapi) ;; *) $C build "$s" ;; esac
done

$C up -d
echo "==> staging updated. Test it, then: sh promote.sh"
