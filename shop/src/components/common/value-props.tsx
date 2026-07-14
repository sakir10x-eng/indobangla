const USP: { icon: string; title: string; sub: string }[] = [
  { icon: '🚚', title: 'Fast Delivery', sub: 'Across all Bangladesh' },
  { icon: '💵', title: 'Cash on Delivery', sub: 'Pay when you receive' },
  { icon: '✅', title: '100% Authentic', sub: 'Genuine books only' },
  { icon: '↩️', title: 'Easy Returns', sub: '7-day hassle-free' },
];

/**
 * Hormozi-style value strip for the books home page: stack the reasons-to-buy
 * right under the hero so the offer feels bigger than the price.
 */
export default function ValueProps() {
  return (
    <section className="mx-auto max-w-[1500px] px-5 py-4 sm:px-8 lg:px-12">
      <div className="space-y-3">
        {/* value headline */}
        <div className="rounded-xl bg-gradient-to-r from-accent to-accent-hover px-5 py-4 text-center text-white">
          <p className="text-base font-bold sm:text-lg">
            Thousands of books at the best prices — delivered to your door.
          </p>
          <p className="mt-1 text-xs opacity-90 sm:text-sm">
            New arrivals & bestsellers · Pre-order upcoming titles · Buy more, save more
          </p>
        </div>

        {/* USP badges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {USP.map((it) => (
            <div
              key={it.title}
              className="flex items-center gap-3 rounded-lg border border-border-200 bg-light px-4 py-3"
            >
              <span className="text-2xl">{it.icon}</span>
              <div>
                <p className="text-sm font-bold text-heading">{it.title}</p>
                <p className="text-[11px] text-body">{it.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* trust / guarantee band */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-xs font-semibold text-green-800">
          <span>🛡️ 100% Satisfaction Guarantee</span>
          <span>⭐ 4.8/5 from thousands of readers</span>
          <span>🔒 Secure checkout</span>
          <span>🎁 Reward points on every order</span>
        </div>
      </div>
    </section>
  );
}
