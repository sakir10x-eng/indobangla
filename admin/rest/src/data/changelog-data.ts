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
