# IndoBangla — Code Bug & Security Audit
**Date:** 2026-07-24 · **Scope:** auth/login, checkout/payment, API authorization, storefront user-journey · **Method:** 4 parallel deep-trace audits of custom code (`api/packages/marvel`, `shop/`), each finding independently verified against the real code path.

> **Verdict:** The *previously-known* bad bugs are genuinely fixed (fake-payment, settings secret-wipe, "0 books" orders, SEO/OG). The money-*capture* path (bKash) is solid. **But order *creation* and several custom customer endpoints are under-protected**, producing one Critical account-takeover chain and one Critical price-tampering hole that need fixing before the next promote.

> **REMEDIATION STATUS (2026-07-24, branch `security-fixes-0724`):** ✅ **All Critical + High fixed** (commit `cc66119`). ✅ **All Medium + Low fixed** in a follow-up commit **except three deferred**: **M3** delivery-fee server-side recompute (touches the live money-total path — needs its own tested change; the `≥0` clamp is in place), **6-digit OTP** (frontend expects 4 digits — throttling is the interim brute-force control), and the **guest-order enumeration second factor** (tracking_number == sequential id is load-bearing for the order board). Not yet deployed. L8 (demo `public/sql`) is gitignored/untracked — deleted locally; block `/sql/` at nginx on the live box to be safe.

---

## Severity index

| # | Sev | Issue | Where |
|---|-----|-------|-------|
| C1 | 🔴 Critical | Account takeover (3 write-paths → victim phone → OTP reset) | `admin-create-customer`, `update-contact`, `updateUser` |
| C2 | 🔴 Critical | Order total tampering via unclamped negative `sales_tax` (pay ৳1) | `OrderRepository::storeOrder` |
| H1 | 🟠 High | Customer PII disclosure (order enumeration, 2 vectors) | `GET /orders/{id}`, order history |
| H2 | 🟠 High | Unauthenticated CMS / seller-commission writes | `became-seller`, `custom-page` |
| H3 | 🟠 High | Read-SSRF via AI image/URL fetch | `AiExtractController::fetchImage` |
| H4 | 🟠 High | Public unthrottled LLM endpoint (drains AI key) | `generate-descriptions` |
| H5 | 🟠 High | Order-create silently fails on 200-error-envelope (no feedback) | `useCreateOrder` |
| H6 | 🟠 High | 4-digit OTP brute-force (unthrottled reset/login) | `otp-login`, `reset-password-otp` |
| H7 | 🟠 High | SMS-bombing / SMS-cost DoS (unthrottled send) | `send-otp-code` |
| H8 | 🟠 High | Social login null-email → logs into another account | `UserController::socialLogin` |
| M1–M11 | 🟡 Medium | see below | |
| L1–L9 | 🟢 Low | see below | |

---

## 🔴 CRITICAL

### C1 — Silent account takeover (one request, no SMS to victim)
Three independent write-paths let an attacker set **another user's `profile.contact`** to a phone they control; the OTP/reset flow then resolves that phone back to the victim and issues an auth token / resets the password. Found independently by both the auth audit and the API-authz audit.

**Enabling sink (shared):** `resetPasswordByOtp` / `otpLogin` resolve an account by **last-10-digits of the phone** (`IntegrationController.php:8789-8793`, `UserController.php:889`), the profile is matched, and a token is issued (`UserController.php:1001-1005`). `Profile`/`Address` models are `$guarded = []` (`Models/Profile.php:12`, `Models/Address.php:12`).

**Write vectors (any one is enough):**
1. **`admin-create-customer` — no authorization** *(worst; reachable by any logged-in customer with only the victim's email)*
   `IntegrationController.php:327` (route `Rest/Routes.php:460`) sits in the bare `auth:sanctum` group with no permission middleware. It does `User::firstOrCreate(['email'=>$email])` then **overwrites** the found user's `name` (`:340-343`) and `profile.contact` (`:347`).
   → `POST /admin-create-customer {email:"victim@x", contact:"<attacker phone>"}`.
2. **`update-contact` — request-supplied `user_id`**
   `UserController.php:1016-1039` (route `Rest/Routes.php:554`) reads `$user_id = $request->user_id` (not `$request->user()->id`); the OTP only proves the caller owns the *phone*, not the *user_id*.
   → get OTP for own phone, then `POST /update-contact {user_id:<victimId>, phone_number:<own>, otp_id, code}`.
3. **`PUT /users/{id}` → `updateUser` — profile IDOR**
   `UserRepository.php:88-104` (route `Rest/Routes.php:552`) does `Profile::findOrFail($request['profile']['id'])->update(...)` with no owner check; ids are sequential.
   → `PUT /users/<myId> {profile:{id:<victimProfileId>, contact:"<attacker phone>"}}`.

**Chain:** any vector → victim's contact = attacker phone → `POST /send-otp-code` + `POST /reset-password-otp` (or `/otp-login`) → attacker holds a token for the victim's account. Includes admin accounts whose profile carries a contact. Victim never receives an SMS.

**Fix:**
- Add `permission:SUPER_ADMIN|STORE_OWNER|STAFF` to `admin-create-customer`; only *fill* name/contact on create, never overwrite an existing user.
- In `update-contact`, ignore `user_id`, always use `$request->user()->id`.
- In `updateUser`, scope `profile.id`/`address.id` writes to `where('customer_id', $request->user()->id)`; give the models explicit `$fillable`.
- Give OTP-resolvable contacts a `contact_verified_at`; only resolve/reset against a verified contact.

### C2 — Order total driven to ৳1 via unclamped negative `sales_tax`
`OrderRepository.php:460` — `$computedTotal = round($amount + $request['sales_tax'] + $delivery_fee - $discount, 2)`.
Unit prices, line subtotals and discount **are** recomputed server-side (verified sound), and `delivery_fee` is clamped `≥0`. But `sales_tax` is taken **raw** from the request, is **not** in `OrderCreateRequest::rules()`, is never recomputed, and is **not** clamped — so a **negative** value is accepted. `paid_total = computedTotal`; the bKash pay-link amount (`stampPayLink`, `:156`) then becomes ~৳1, and settlement marks it fully paid. Works for COD too.

**Exploit:** `POST /orders { ...products:[{product_id:123,order_quantity:1}], sales_tax:-4999, ... }` → total = `5000 + (-4999) + 0 - 0 = 1`.

**Fix:** recompute `sales_tax` server-side (the tax logic already exists in `CheckoutRepository::calculateTax`); at minimum `sales_tax = max(0, (float)$request['sales_tax'])`, and guard `total >= sum(line subtotals) - validated discount`.

---

## 🟠 HIGH

### H1 — Customer PII disclosure via order enumeration (two vectors)
1. **Public, unauthenticated:** `GET /orders/{tracking_number}` is a public route; `fetchSingleOrder` returns the order when `customer_id` is null (`OrderController.php:234-236`) — which is every **guest** order. Tracking numbers are the **sequential row id** (25000+, `Order.php:114`), and `ops_meta` is not in `$hidden` → the response leaks name, phone, address, items, **and pay tokens / payment ids**. `for i in 25000..26000; curl /backend/orders/$i` dumps every guest customer.
2. **Authenticated:** order history matches on "my profile contact's last-10-digits == order `customer_contact`" (`OrderController.php:120-131`), but a customer can set their own contact with no OTP (C1 vector 3) → set it to a victim's phone → `GET /orders` returns the victim's orders.

**Fix:** require pay-token or verified owner even for null-`customer_id` orders; drop `ops_meta` from the public `show`; decouple `tracking_number` from the row id; match history only on a verified contact.

### H2 — Unauthenticated CMS & seller-commission tampering
`became-seller` and `custom-page` (`store/update/destroy`) are registered **outside every middleware group** (`Rest/Routes.php:826-829`) and their FormRequests `return true` (`BecameSellersRequest.php:17`, `CustomPageRequest.php:17`). Anyone unauthenticated can rewrite platform **commission tiers** (`BecameSellerController.php:72`) and create/deface/delete About/Terms/Privacy pages.
**Fix:** move both write blocks into the `permission:SUPER_ADMIN` group; authorize the FormRequests on the real permission.

### H3 — Read-SSRF via AI image fetch (STAFF-reachable)
`AiExtractController::fetchImage` (`:821`) validates `image_url` as `required|string` only (no scheme/host allow-list), then `storeImageFromUrl` (`:957`) does `Http::get($url)` and **writes the body to public storage**, returning its URL. A staff token can fetch `http://127.0.0.1:<port>/…` or cloud-metadata and read the response. Same pattern in `fetchPageText`/`fetchOgImage`/`listCrawl`.
**Fix:** allow-list public hosts, resolve DNS and block private/loopback/link-local ranges (and redirects to them), require `image/*`, cap size.

### H4 — Public, unthrottled LLM endpoint
`generate-descriptions` (`AiExtractController.php:90`, route `Rest/Routes.php:192`) has **no auth, no throttle**, and calls `callLLM` with an attacker-controlled `prompt` using the admin's paid key → credit drain + free LLM proxy.
**Fix:** gate behind `permission:SUPER_ADMIN|STORE_OWNER|STAFF`, add `throttle:`, cap prompt length.

### H5 — Order placement silently fails (no toast, no navigation)
`useCreateOrder` `onSuccess` (`shop/src/framework/rest/order.ts:228-264`) doesn't inspect the HTTP-200 `{errors:[{message}]}` envelope. On the common real failures (stock race, invalid coupon, quota) it gets an error body, matches no success branch, and does **nothing** — spinner stops, cart intact, no message. `onError` never fires (200 didn't reject). Both logged-in (`place-order-action.tsx:122`) and guest (`indo-guest-checkout.tsx:112`) flows. *(Not a forgery — no fake success — but a dead-end on the highest-value action.)*
**Fix:** at the top of `onSuccess`: `if (order?.errors?.[0]?.message) { toast.error(order.errors[0].message); return; }`; only navigate when a real `tracking_number` exists.

### H6 — 4-digit OTP brute-forceable (unthrottled reset/login)
`otp-login` / `reset-password-otp` (`Rest/Routes.php:87-88`) have **no throttle**; OTP is `random_int(1000,9999)` (`SmsnetbdGateway.php:72`). A code burns after 5 wrong tries, but `send-otp-code` is also unthrottled, so an attacker mints unlimited fresh `otp_id`s and keeps guessing (~1800 cycles cover the space) → phone-based reset/login for any number.
**Fix:** per-phone + per-IP throttle on send/verify/reset; 6-digit codes; cumulative per-phone attempt cap; account lockout.

### H7 — SMS-bombing / cost DoS
`send-otp-code` (`Rest/Routes.php:85`) is public, unauthenticated, unthrottled, no per-number cap → flood any phone with SMS and drain the sms.net.bd balance. (The 30s resend cooldown is client-only, `login-form.tsx:120`.)
**Fix:** IP throttle + per-destination daily cap + server-side resend cooldown.

### H8 — Social login collides on NULL email
`UserController.php:822` — `User::firstOrCreate(['email'=>$user->getEmail()], …)`. When the provider returns no email (Facebook often), `firstOrCreate(['email'=>null])` matches the **first existing user with email = null** — and phone-only accounts now legitimately have null email. → email-less social login lands in an arbitrary customer's account.
**Fix:** reject social login when the provider email is empty; never match on null email.

---

## 🟡 MEDIUM
- **M1** Social token audience not verified (`UserController.php:819`) — a Google/FB token minted for another OAuth app can be replayed; **and** social login skips the admin SMS-2FA gate (`:858-863`). Verify `id_token` aud == our client id; route admins through `beginAdminOtp`.
- **M2** Password-reset tokens **never expire** (`UserController.php:701-708`; `created_at` written but never checked); `/reset-password` & `/forget-password` unthrottled. Reject tokens older than N min.
- **M3** Free-shipping bypass — `delivery_fee` taken from client, only clamped ≥0, real zone charge not enforced at creation (`OrderRepository.php:449-454`). Recompute server-side.
- **M4** Stock oversell — no stock re-check at creation; `commitStock` decrements with no `quantity>=qty` guard and no lock (`Order.php:218-239`) → negative stock / concurrent oversell. Re-check inside the txn + conditional atomic decrement.
- **M5** Coupon reuse — no per-user/global redemption cap enforced at order time (`OrderRepository.php:412-447`). Add a redemptions counter if reuse isn't intended. (Discount is clamped ≥ goods value, so no negative total.)
- **M6** Integration secrets to sub-admins — `getReplygenieSettings` returns raw `connect_token` (`IntegrationController.php:1414`) and `getNotifySettings` returns Telegram `bot_token` (`:1462`); sub-admins keep `super_admin` (`AdminRolesTrait.php:19-23`) so these aren't gated by `isFullSuperAdmin`. The connect_token lets the holder drive any order via `/replygenie/agent`. Redact on read or gate to full super-admin.
- **M7** NotifyLogs IDOR — `show`/`readNotifyLogs`/`readAllNotifyLogs` (`NotifyLogsController.php:84-164`) don't scope to `receiver` → read/tamper any user's notifications. Constrain to `$request->user()->id`.
- **M8** Sub-admin can hit any `can:SUPER_ADMIN` route (section limit is UI-only) — e.g. `addPoints` (`UserController.php:1041`) credits arbitrary wallet points (= money), payment/courier settings, product force-delete. *(True escalation endpoints — create/promote admin — ARE hard-guarded by `isFullSuperAdmin`, verified.)* Add per-section server-side checks for money/settings routes.
- **M9** Thank-you page crash — `order?.payment_gateway.toLowerCase()` (`shop/src/pages/orders/[tracking_number]/thank-you.tsx:53`) doesn't guard `payment_gateway`; null (wallet/free order) → white-screen. Use `?.`.
- **M10** "Pay now" dead when `ops_meta.pay_token` missing (`pay-now-button.tsx:24-37`); and non-preorder bKash routes to `/orders/{tracking}/payment` (no payment_intents table) instead of `/pay/{token}` (`order.ts:249-255`). Route any order with a `pay_token` straight to `/pay/{token}`; show a message when absent.
- **M11** Register empty-roles = silent no-op — `useRegister` (`user.ts:372-381`) logs in only if `data.token && data.permissions?.length`; empty roles → token issued but nothing happens, no toast. Envelope failure also mis-reports "email taken" as "wrong credentials." Treat `data.token` alone as success; surface `data.errors[0].message`.

## 🟢 LOW
- **L1** Customer tokens never expire (`UserController.php:365-368`) and live in a JS-readable cookie; password change doesn't revoke tokens. Expire + revoke-on-reset; prefer httpOnly.
- **L2** Public register honors client `permission` → self-grant `store_owner` role (`UserController.php:577-586`). Impact limited (shop still needs approval). Don't honor it.
- **L3** Customer can set own `shop_id` via `PUT /users/{id}` (`UserRepository.php:36-40`); `forgetPassword`/`sendOtpCode` reveal account existence (enumeration).
- **L4** No global React error boundary (`shop/src/pages/_app.tsx`) — any render throw white-screens the route. Wrap page render in a boundary.
- **L5** `library-view.tsx:34,51-57` assumes `my_review_stats` present → crash on partial payload. Default the shape.
- **L6** `verify-email.tsx:24` calls `router.push` during render. Move into `useEffect`.
- **L7** Community "login" link resolves to `/` (no `login` route key) instead of opening the login modal. Use `openModal('LOGIN_VIEW')`.
- **L8** Stock Pickbazar demo SQL seeds served from `api/public/sql/*.sql` (schema + demo bcrypt hashes) if docroot is `public/`. Delete or block `/sql/`.
- **L9** `advance_paid` accepted from any client (`OrderRepository.php:468-471`) — can only lower paid_total (not exploitable for underpayment), but should be staff-gated.

## Non-security bugs
- **Empty-roles under-privilege** (real availability bug): phone `token()` branch (`UserController.php:291`), existing-profile `otpLogin` (`:1001`), and `resetPassword` (`:716`) issue a token without ensuring the CUSTOMER role → a role-less imported account gets a valid token but is 403'd everywhere (incl. `/me`). Backfill / assign role on these paths.
- `resetPassword` picks among duplicate-email rows by `is_active` not by the reset target (`:716`) — can reset the wrong duplicate.
- `UserController::update` has no `else` (`:215-224`) → non-owner gets HTTP 200 empty body instead of 403.

---

## ✅ Verified SOUND (previously-known issues confirmed fixed — no action)
- **bKash payment capture** — `bkashCallback` re-verifies server-side (`executePayment`/`queryPayment`, requires `statusCode 0000 + Completed + trxID`), idempotent, credits bKash's own captured amount. No forgery/replay.
- **"Fake payment complete" — fixed:** `pay/[token].tsx` detects the 200-error envelope and only shows success on explicit `status:'success'|'redirect'`; `payConfirm` can only *initiate*, never mark paid.
- **Settings secret-wipe — fixed:** `SettingsController::store/update` carry stored `couriers/replygenie/ai_settings/payments/notify` forward; `index` strips them; courier/payment getters return only `has_token`.
- **Admin-escalation endpoints hard-guarded** by `isFullSuperAdmin` (createAdmin/assignAdminRole/adminRoles/makeOrRevokeAdmin) — sub-admins can't mint/promote admins or change `admin_role_id`.
- **Order-status/`completed` lock** enforced in the model `updating` hook; update/destroy behind STAFF|STORE_OWNER.
- **Pay/invoice tokens** are `Str::random(24)` — not enumerable.
- **No SQL injection** in custom code (all raw fragments static or bound); **no committed `.env`, no phpinfo leak**.
- **"0 books" orders — fixed** (products eager-loaded on list, `hasItems` guard); **SEO/OG + Maintenance — sound** (OG renders outside `<Maintenance>`); **product SSG safe** (`notFound:true` on error).

---

## Recommended fix order (before next promote)
1. **C1** — lock down `admin-create-customer` + `update-contact` + `updateUser` profile writes, and require a verified contact for OTP resolution. *(Backend only, hot-patchable.)*
2. **C2** — clamp/recompute `sales_tax` (+ delivery_fee) in `storeOrder`. *(Backend only.)*
3. **H1** — access-control `GET /orders/{id}`, drop `ops_meta` from public show.
4. **H2/H3/H4** — add missing auth/throttle to `became-seller`/`custom-page`, SSRF allow-list on AI fetch, gate `generate-descriptions`.
5. **H5** — order-create error-envelope guard (shop deploy).
6. **H6/H7** — throttling + 6-digit OTP.

*Everything C/H except H5 is backend-only and can ship without a shop rebuild.*
