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
    version: '2026.07.24',
    date: '24 Jul 2026',
    title: 'Security hardening across sign-in, checkout and admin, plus checkout & page fixes',
    items: [
      { type: 'fixed', text: 'Books carried over from the old site showed no ISBN, print type, page count, printed country, language, condition or edition — those details sit in the old per-book columns and the new product screen only read the newer “book spec” store, which only ~29 of ~9,000 books had. All of them now show again (≈7,900 print types, ≈7,900 printed countries, ≈7,000 page counts, ≈4,500 ISBNs), and old wordings like “hardcover”, “Old (unused)” or “Abroad” are matched to the new dropdown options instead of being blanked' },
      { type: 'added', text: 'Product entry: a “search keywords” field under Group & Categories, auto-suggested from the book’s own details (name, Bangla name, author, publisher, categories, tags, edition, ISBN) and freely editable. The storefront search now matches these words too, so a book is findable by synonyms, alternate spellings or a series name its title doesn’t contain' },
      { type: 'improved', text: 'Product entry: Print Type and Condition are now dropdowns instead of free text — Hardcover / Paperback / Flexibound / Leatherbound, and New / Used / Old Stock (unused) / Little Damaged / Damaged (new books default to New)' },
      { type: 'added', text: 'Multi-vendor delivery charge: when a cart includes another vendor’s book, that vendor’s own delivery charge (Dhaka ৳60 / outside ৳120 by default, editable per shop by the vendor or a super-admin) is added on top of the order’s delivery fee. The main store’s own shops add nothing extra' },
      { type: 'improved', text: 'Store analytics now captures real page views, visitor journeys and a “most added to cart” book list — most of those numbers used to read zero because page-view tracking was never switched on. The failed-login panel now populates too' },
      { type: 'improved', text: 'Login, OTP, checkout, payment and book-search failures now show a clear message instead of a silent dead button, and a book-search error no longer reads as “no books found”. Every such failure is logged to a new analytics “journey errors” panel so recurring pain points are visible and fixable' },
      { type: 'fixed', text: 'Order board delivery timeline: every status (Ready, Shipped, In transit, Delivered) now records the date & time it was reached — before, only Pending showed a time because courier-synced status changes weren’t being timestamped' },
      { type: 'fixed', text: 'Placing an order that could not go through — a coupon that had just expired, or a book that had just sold out — left the button spinning with no message. It now tells the customer why instead of quietly failing' },
      { type: 'fixed', text: '“Pay now” now sends the customer straight to the payment page for every online (bKash) order, not just pre-orders — a normal online order no longer got stranded on an empty payment screen' },
      { type: 'fixed', text: 'The order thank-you page and the Library page could show a blank screen on certain orders/accounts. Both are guarded now, and any unexpected page error shows a “try again” panel instead of a white screen' },
      { type: 'improved', text: 'Sign-in, OTP and password reset are hardened: reset links now expire, sign-in / OTP / reset requests are rate-limited against guessing and SMS abuse, a password change or reset now signs out other devices, and social sign-in is verified more strictly' },
      { type: 'improved', text: 'Order and payment amounts are fully recomputed on the server so a total cannot be tampered with, and customers’ contact and order details are better protected from being read by anyone else' },
      { type: 'improved', text: 'Stored integration secrets in the admin panel (payment / courier / notification tokens) are now shown only to a full super-admin — a section-restricted sub-admin sees a masked value, and saving no longer risks wiping them' },
      { type: 'improved', text: 'Stock is now reserved atomically at checkout, so the same last copy can’t be sold twice or pushed into negative stock' },
    ],
  },
  {
    version: '2026.07.22',
    date: '22 Jul 2026',
    title: 'New storefront header & order pages, support tickets, and a run of payment fixes',
    items: [
      { type: 'fixed', text: 'A COD invoice link showed the order as already PAID with ৳0 due — on every COD order, from the moment it was created. A courier reading that slip could hand the books over without collecting' },
      { type: 'fixed', text: 'Opening a book from the home page bounced straight back to home, and scrolling the home page jumped back to the banner — an expired login was navigating the whole site away' },
      { type: 'fixed', text: 'A draft product could not be published: the status radio was locked, and the save silently turned it back into a draft. AI-batch and pre-order both create drafts, so nothing they made could go live' },
      { type: 'fixed', text: 'Editing an order’s books left the payment link, invoice and due amount showing the pre-edit figures, and an order with money owing could read as paid' },
      { type: 'fixed', text: 'A fully paid order still printed “Total Payable” on the slip' },
      { type: 'fixed', text: 'Product edit refused to save whenever stock was 0 — fixing a title on a sold-out book meant faking stock. Quantity is now optional and unit defaults to 1' },
      { type: 'fixed', text: 'Forgot-password: a repeat request mailed the same old token, and the new password could land on a deactivated duplicate account — reset said success, login said wrong password. Failures are also shown now instead of nothing happening' },
      { type: 'fixed', text: '/admin/analytics never updated: the endpoints behind it had been lost in an old file upload, along with POS drafts, the product recycle bin and invoice links. All restored' },
      { type: 'fixed', text: 'Weight charge, editable paid amount and the bKash service charge were silently doing nothing — the screens sent them, the server ignored them' },
      { type: 'fixed', text: 'Coupon dates could not be edited on an existing coupon (every selectable day was out of range)' },
      { type: 'fixed', text: 'Every dropdown on the site drew a grid of tiled arrows instead of one' },
      { type: 'fixed', text: 'Mobile: the header search box was squeezed to an unusable width, and the category / offers / genre dropdowns opened into nothing' },
      { type: 'added', text: 'Support tickets on /help — customers can open a ticket, see its status and reply in a thread; answer them from Settings → Product Reports' },
      { type: 'added', text: 'Redesigned My Orders and order-detail pages for customers: running / done / cancelled tabs, a five-step delivery tracker, and a full bill breakdown' },
      { type: 'added', text: 'New storefront header and footer across every page — category mega-menu, scoped search (book / author / publisher), live offers, today’s deals, and an advanced search that filters by author, publisher and price range' },
      { type: 'added', text: 'Pre-order: paste up to 20 Amazon links at once and each becomes its own book row; create the customer up front; add the bKash service charge; upload or replace the cover by hand when Amazon blocks the fetch' },
      { type: 'added', text: 'AI batch: edit price, sale price, cover and the inside-page gallery before publishing' },
      { type: 'added', text: 'Coupons: an on/off switch on the list, and every coupon on /offers now draws its own cover instead of sharing one placeholder' },
      { type: 'added', text: 'Invoice pages show each book’s cover' },
      { type: 'improved', text: '/admin/my-shops lists every shop for an admin with search and paging, and the cards show their real cover image' },
      { type: 'improved', text: 'The product gallery field now says plainly that it drives the “বইয়ের ভেতরে এক ঝলক” section on the book page' },
      { type: 'improved', text: 'Profile “নতুন বই এসেছে” no longer lists pre-orders — those books are not on the shelf yet' },
    ],
  },
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
