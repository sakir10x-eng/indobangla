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

## The workflow

```
  edit code  ->  git commit  ->  sh stage.sh   ->  test on staging.indobangla.tech
                                                       |
                                                  looks right?
                                                       |
                                                 sh promote.sh   ->  indobangla.tech
                                                       |
                                                  went wrong?
                                                       |
                                                 sh rollback.sh  (seconds, no rebuild)
```

`promote.sh` tags whatever is live as `:previous` before it swaps anything in, so there is
always something to roll back to. **A rollback does not undo a database migration** — if the
release included one, deal with that separately.

## Staging

`staging.indobangla.tech` runs the same three apps against **its own MySQL, its own Redis and
its own network**. Nothing is shared with live but the Traefik edge.

It was originally built to share live's network and MySQL container, to save ~400 MB of RAM.
That was a mistake, and it broke the live site: Compose always publishes a service's *name*
as a network alias, so with both stacks on one network `api` resolved to two containers and
live's nginx served staging data on indobangla.tech about half the time. `aliases:` does not
help — the service name is added regardless. Staging's services are therefore named
`sapi` / `sshop` / `sadmin`, and they have their own network. Do not "simplify" this back.

**Build the API before the shop.** Next.js fetches from the API *during* the static build, so
if `https://staging.indobangla.tech/backend` isn't answering yet the build dies with
`getaddrinfo ENOTFOUND`. `stage.sh` waits for the API before it builds anything else.

The shop and admin images bake `SITE_URL` into the bundle at build time, so a staging image
can never serve live and vice-versa. Only the API image is promoted byte-for-byte; the two
Next apps are rebuilt for the live hostname **from the same commit**.

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
