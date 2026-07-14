# Deploying IndoBangla

Live: <https://indobangla.tech> — one VPS (`72.61.244.150`), Docker Compose, Traefik at the
edge. Shop at `/`, admin at `/admin`, Laravel API at `/backend`.

This box is **shared with other projects** (monthon, replygenie, n8n, saas-copilot). Only
ever touch the `indobangla` compose project; the other stacks have their own containers and
their own databases.

## Secrets

Nothing secret is in this repo. `deploy/.env` and `deploy/.env.api` live on the server only
and are git-ignored. `docker-compose.yml` reads them with `${VAR}`.

`Dockerfile.shop` takes the NextAuth secret as a **build arg** (`ARG SECRET`), fed from
`NEXTAUTH_SECRET` in `deploy/.env`. Never hard-code it in the Dockerfile: it would be baked
into every image layer and land in git.

> **Not yet done on the server.** The production `Dockerfile.shop` still hard-codes the
> secret. Move the value into `deploy/.env` as `NEXTAUTH_SECRET`, add
> `args: { SECRET: ${NEXTAUTH_SECRET} }` to the `shop` build block in the compose file, and
> rebuild the shop.

## Deploying

```bash
cd /opt/indobangla/deploy
docker compose build api      # ~2 min
docker compose build admin    # ~5 min
docker compose build shop     # ~6 min
docker compose up -d api admin shop
docker compose exec -T api php artisan migrate --force   # only when there are migrations
```

Builds are heavy and the box has ~4 GB of RAM free, so **build one service at a time**.
Run long builds under `nohup` — a dropped SSH session has killed a build before:

```bash
nohup sh build_all.sh > build.log 2>&1 &
```

A failed build is safe: the old container keeps serving until `up -d` swaps it.

## Database

Back up **before** anything that writes to the database:

```bash
PW=$(grep -h ^DB_PASSWORD= .env .env.api | head -1 | cut -d= -f2-)
docker exec -e MYSQL_PWD="$PW" indobangla-db-1 \
  mysqldump -u indobangla --single-transaction --quick indobangla | gzip > backup_$(date +%F).sql.gz
```

Never pipe a foreign dump straight into the live database. A `mysqldump` begins each table
with `DROP TABLE IF EXISTS`, so it will silently take the live schema with it — including
every column our features added (`mrp`, `ops_meta`, `is_preorder`, `membership_no`). Import
into a scratch database first, then copy the rows across.

## The main shop

The shop that owns the catalogue is `Settings.options.main_shop_id`. It used to be looked up
by the slug `indobangla-store`; a database import replaced the shops table, the slug stopped
existing, and everything that creates a product or an order broke without a single error in
the log. If it ever needs changing, change the setting — do not hard-code a slug.
