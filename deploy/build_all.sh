#!/bin/sh
cd /opt/indobangla/deploy
echo "START $(date)"
echo "=== build admin ==="; docker compose build admin && docker compose up -d admin && echo "ADMIN_OK"
echo "=== build shop ==="; docker compose build shop && docker compose up -d shop && echo "SHOP_OK"
echo "DONE $(date)"
