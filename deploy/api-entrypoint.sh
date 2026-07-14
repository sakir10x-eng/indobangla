#!/bin/sh
set -e
cd /app
[ -f .env ] || cp .env.example .env
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
php artisan package:discover --ansi || true
php artisan storage:link || true
php artisan config:clear || true
php artisan route:clear || true
php-fpm -D
nginx -g "daemon off;"
