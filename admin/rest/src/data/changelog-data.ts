// IndoBangla release log. Add a new entry to the TOP of RELEASES every time an
// update is promoted to live, so the admin "Updates" page always shows — in order —
// what each release added, improved, or fixed. Newest first.

export type ChangeType = 'added' | 'improved' | 'fixed';
export type ChangeItem = { type: ChangeType; text: string };
export type Release = {
  version: string;      // e.g. "2026.07.15"
  date: string;         // human date, e.g. "15 Jul 2026"
  title: string;        // one-line summary of the release
  items: ChangeItem[];
};

export const RELEASES: Release[] = [
  {
    version: '2026.07.18',
    date: '18 Jul 2026',
    title: 'OTP login, pay & invoice links, courier tracking, order fixes',
    items: [
      { type: 'added', text: 'Admin login is now protected by a two-step SMS OTP with a 3-day session — pick the primary or backup number to receive the code' },
      { type: 'added', text: 'Order board: copy the online-payment (bKash) link straight from a card, with an optional bKash 1.85% service-charge box' },
      { type: 'added', text: 'Shareable invoice link — send the customer a link to view / print their invoice (🧾 button on the board and order view, and a new /invoice page)' },
      { type: 'added', text: 'Order list: the courier tracking id is now a clickable link that opens the parcel status on the courier panel (RedX etc.)' },
      { type: 'added', text: 'Invoice print now shows each book’s publisher/manufacturer, and for an advance order an “Advance Paid / Due on Delivery” split' },
      { type: 'added', text: 'Weight charge field is back in the order’s Payment adjustment box' },
      { type: 'improved', text: 'New orders start as Pending; Void now marks an order as a dead/test order and excludes it from every statistic' },
      { type: 'improved', text: 'POS Create-order opens fresh every time (no leftover customer or cart); cart items gained a Refresh and Edit-in-new-tab button' },
      { type: 'improved', text: 'The /pay link now shows any advance already paid and the real remaining amount due' },
      { type: 'fixed', text: 'An advance / partial payment no longer shows the order as “fully paid” — the advance is respected and the rest stays due' },
      { type: 'fixed', text: 'Stock was being deducted twice per order — it now decrements exactly once, and Void fully restores it' },
    ],
  },
  {
    version: '2026.07.15',
    date: '15 Jul 2026',
    title: 'Product tools, landing pages, security & speed',
    items: [
      { type: 'added', text: 'Product Copy & Move between shops (📋 / ⇄ buttons in the product list)' },
      { type: 'added', text: 'Cover image upload in the AI Auto-fill panel (manual product entry)' },
      { type: 'added', text: 'Printed Country dropdown — non-Bangladesh books auto-price from MRP × conversion rate' },
      { type: 'added', text: 'Category-wise conversion presets (e.g. Magazine × its own rate) in Settings → Conversion Rate' },
      { type: 'added', text: 'Landing-page templates + the আনন্দমেলা ১৪৩৩ special design' },
      { type: 'added', text: 'Per-product marketing landing pages at /landing/<slug>' },
      { type: 'added', text: "Reader's Club card status (active / cancelled / banned) + validity window" },
      { type: 'added', text: 'Site favicon built from the IndoBangla logo (book + brand red)' },
      { type: 'added', text: 'This Updates / changelog page' },
      { type: 'added', text: 'bKash production payment enabled (live credentials, callbacks on indobangla.bd)' },
      { type: 'fixed', text: 'Admin order checkout: fixed 500 error (payment intent) so bKash/Stripe orders can be placed' },
      { type: 'improved', text: 'Admin order checkout: billing address now optional, cleaner polished layout' },
      { type: 'improved', text: 'Address form: Shipping + Bangladesh set by default, "other area" free-text, ZIP optional' },
      { type: 'improved', text: 'Speed: HTTP/2 + gzip on JS/CSS bundles' },
      { type: 'improved', text: 'Security: hidden server version, security headers, per-IP rate-limit + login brute-force guard' },
      { type: 'improved', text: 'Profile page redesign' },
      { type: 'fixed', text: 'Product create/update showed a 500 error ("isProductReview" / "enableEmailForDigitalProduct")' },
      { type: 'fixed', text: 'Sale price could not be left empty when updating a product' },
      { type: 'fixed', text: 'Pre-order "Add to cart" button shape / text overflow on the product page' },
      { type: 'fixed', text: '"Add product" button led to a 404 page' },
    ],
  },
];
