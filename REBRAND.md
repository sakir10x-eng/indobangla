# IndoBangla — Rebrand of the Pickbazar stack

This project is a **rebranded copy** of the Pickbazar (Laravel + Next.js) multi-vendor
e-commerce platform. The **database design is unchanged** — same Laravel migrations, same
tables, same relationships. Only the **brand identity (name, colors, logo, seeded copy)**
was changed so the app presents as its own product ("IndoBangla") instead of Pickbazar.

## Stack (same as source)

- `api/` — Laravel REST + GraphQL API (business logic lives in the `api/packages/marvel` package).
- `shop/` — Next.js storefront (runs in REST or GraphQL mode).
- `admin/rest/`, `admin/graphql/` — Next.js admin dashboards.

## What was rebranded

### 1. Brand name → **IndoBangla**
Replaced across `shop/`, `admin/`, and root configs (case-preserving):
`PickBazar → IndoBangla`, `Pickbazar → Indobangla`, `pickbazar → indobangla`,
`pick-bazar → indobangla`.
- Package names: `@indobangla/shop`, `@indobangla/admin-rest`, `@indobangla/admin-graphql`,
  root `indobangla`, `indobangla-admin`. Workspace scripts updated to match.
- Frontend constants renamed consistently on both sides: `PICKBAZAR_ERROR → INDOBANGLA_ERROR`,
  `PICKBAZAR_MESSAGE → INDOBANGLA_MESSAGE`, localStorage key `pickbazar-checkout → indobangla-checkout`.
- SEO / site config: `shop/src/config/site.ts`, `admin/*/src/settings/site.settings.ts`,
  `admin/*/src/contexts/settings.context.tsx`, `default-seo` components, `manifest.json`
  (`name`, `short_name`), all `public/locales/*/common.json`.

### 2. Accent color → **red** (was Pickbazar teal `rgb(0,159,127)` / `#35C4D7`)
Edited the CSS custom-property theme in all three apps:
- `shop/src/assets/css/main.css`
- `admin/rest/src/assets/css/main.css`
- `admin/graphql/src/assets/main.css`

Primary `--color-accent: 220, 38, 38` (`#DC2626`) with a full red `--accent-50…1000` scale.
Hardcoded teal in `builder/components/card.tsx` (`#35c4d7 → #dc2626`) and manifest
`background_color` (`#004740 → #7F1D1D`) also updated.

### 3. Logo
- New `IndoBangla` wordmark SVG (red bag glyph + two-tone text) at
  `shop/public/logo.svg`, `admin/rest/public/logo.svg`, `admin/graphql/public/logo.svg`.
- `collapse-logo.svg` and `shop-logo-placeholder.svg` teal fill → red (`#30947F → #DC2626`).

### 4. Laravel API visible content
- `api/.env.example`: `APP_NAME=IndoBangla`, `APP_NOTICE_DOMAIN=INDOBANGLA_`.
- `api/resources/views/welcome.blade.php`: title/heading → "IndoBangla API".
- `SettingsSeeder.php` (seeded into `settings` table, rendered on site): `siteTitle`,
  `aboutUsDescription`, `siteLink`, footer `copyrightText` / `externalText` / `externalLink`,
  and demo social links → IndoBangla. `RedQ` author credit in admin settings → IndoBangla.
- `TermsAndConditionSeeder.php` brand mentions → IndoBangla.

## Intentionally left unchanged (internal / not user-visible)

These carry the "Marvel"/"Pickbazar" engine names but are **never shown to end users**.
Renaming them is a large, unverifiable PHP refactor (no vendor/composer available here),
so they were deliberately kept to avoid breaking the backend. Rename later if you want a
100% scrub:

- **PHP namespace `Marvel\`** and the package directory `api/packages/marvel/` (~500 files:
  `namespace`/`use` statements, `composer.json` autoload + repository path, service providers).
- **`MARVEL_ERROR.*`** error codes (thrown by the Laravel package, matched by the frontend +
  locale keys). Left as-is on both sides so they stay consistent.
- **`MarvelException`** class (the file `src/Exceptions/PickbazarException.php` actually defines
  class `MarvelException`; the `Pickbazar…` filename is unused legacy — safe to delete).
- **Demo seed SQL** in `api/packages/marvel/stubs/sql/pickbazar/` and `DUMMY_DATA_PATH=pickbazar`
  (`config/shop.php` default). These are demo dumps that reference Pickbazar's S3 asset URLs
  (`pickbazarlaravel.s3…`). Replace with your own products/media when seeding real demo data;
  the S3 logo URLs in `SettingsSeeder` also still point at Pickbazar's bucket — upload your own
  logo and update those URLs (or the app falls back to the local `logo.svg`).

## How to run (unchanged from Pickbazar)

Dependencies are **not** installed in this copy.

**API (Laravel):**
```
cd api
composer install
cp .env.example .env      # set DB creds, APP_URL, etc.
php artisan key:generate
php artisan migrate --seed # DB design unchanged; seeds IndoBangla-branded settings
php artisan serve
```

**Storefront + admin (Next.js, yarn workspaces from repo root):**
```
yarn install
yarn dev:shop-rest    # storefront (REST)
yarn dev:admin-rest   # admin (REST)
# GraphQL variants: yarn dev:shop-gql / yarn dev:admin-gql
```
Set each Next app's `.env` (`NEXT_PUBLIC_REST_API_ENDPOINT` / GraphQL endpoint) to your API URL.
