#!/bin/sh
# Put the previous live images back. No rebuild, so it takes seconds.
#
#   sh rollback.sh           # roll back all three
#   sh rollback.sh shop      # roll back just the shop
#
# `promote.sh` tags whatever is live as `:previous` before it swaps anything in, so this
# always has something to go back to — as long as you promoted through that script.
set -e
cd "$(dirname "$0")"

SERVICES="${*:-api admin shop}"

for s in $SERVICES; do
  if ! docker image inspect "indobangla-$s:previous" >/dev/null 2>&1; then
    echo "!! no indobangla-$s:previous — nothing to roll back to"
    exit 1
  fi
done

for s in $SERVICES; do
  docker tag "indobangla-$s:previous" "indobangla-$s:latest"
  echo "    $s <- indobangla-$s:previous"
done

docker compose up -d $SERVICES
echo "==> rolled back [$SERVICES]"
echo "    a database migration is NOT undone by this — check that separately."
