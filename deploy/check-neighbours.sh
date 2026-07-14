#!/bin/sh
# This box is shared. lcghs.edu.bd is a live site on it, served by the HOST's nginx +
# php-fpm + mysql — nothing to do with Docker, and nothing to do with us.
#
# Run this before and after any deploy. If it ever fails, stop and look, because the only
# way we can break that site is by taking something it needs: the ports, the RAM, or nginx.
#
#   sh check-neighbours.sh
set -e

fail=0

echo "== lcghs.edu.bd"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: lcghs.edu.bd' http://127.0.0.1/ || echo 000)
case "$code" in
  200|301|302) echo "   ok (HTTP $code)" ;;
  *) echo "   !! HTTP $code — the school site is not answering"; fail=1 ;;
esac

echo "== services it depends on"
for svc in nginx php8.2-fpm mysql; do
  if systemctl is-active --quiet "$svc"; then
    echo "   ok  $svc"
  else
    echo "   !! $svc is NOT running"; fail=1
  fi
done

echo "== ports 80/443 belong to the host nginx, never to us"
if docker ps --format '{{.Ports}}' | grep -qE '(^|[^0-9])0\.0\.0\.0:(80|443)->'; then
  echo "   !! a container has taken :80 or :443 — that is the school site's edge"; fail=1
else
  echo "   ok  no container is bound to :80/:443"
fi

echo "== memory headroom"
avail=$(free -m | awk 'NR==2 {print $7}')
echo "   ${avail} MB available"
[ "$avail" -lt 800 ] && { echo "   !! low — a build could get something killed"; fail=1; }

[ "$fail" -eq 0 ] && echo "ALL OK — neighbours unaffected" || { echo "PROBLEM — do not proceed"; exit 1; }
