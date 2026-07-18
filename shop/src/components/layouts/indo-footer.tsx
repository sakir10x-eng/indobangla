import Link from '@/components/ui/link';

const CATEGORIES = [
  { name: 'বাংলা বই', slug: 'bengali-books' },
  { name: 'ইংরেজি বই', slug: 'english-book' },
  { name: 'সাহিত্য ও কথাসাহিত্য', slug: 'fiction' },
  { name: 'থ্রিলার', slug: 'thriller' },
  { name: 'ইতিহাস', slug: 'history' },
];

const HELP = [
  { name: 'সব বই', href: '/books/search' },
  { name: 'লেখক', href: '/authors' },
  { name: 'প্রকাশনী', href: '/manufacturers' },
  { name: 'আমার অর্ডার', href: '/orders' },
];

export default function IndoFooter() {
  return (
    <footer className="mt-10 border-t border-border-200 bg-white">
      {/* trust benefits strip */}
      <div className="border-b border-border-100 bg-gray-50">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-3 px-5 py-5 text-center sm:grid-cols-4 sm:px-8 lg:px-12">
          {[
            ['🚚', 'দ্রুত ডেলিভারি', 'সারা বাংলাদেশে'],
            ['💵', 'ক্যাশ অন ডেলিভারি', 'হাতে পেয়ে পেমেন্ট'],
            ['✅', '১০০% অরিজিনাল', 'নিশ্চিত মানের বই'],
            ['↩️', '৭ দিনের রিটার্ন', 'ঝামেলাহীন ফেরত'],
          ].map(([e, t, s]) => (
            <div key={t} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{e}</span>
              <span className="text-xs font-bold text-heading">{t}</span>
              <span className="text-[11px] text-body">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* main footer */}
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
        <div>
          <div className="text-xl font-extrabold text-heading">
            Indo<span className="text-accent">Bangla</span>
          </div>
          <p className="mt-2 text-sm text-body">
            ভারতীয় অরিজিনাল ও বাংলাদেশের সেরা বই — ঘরে বসে অর্ডার করুন। ১২,০০০+ বই ডেলিভারি হয়েছে।
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <a href="https://wa.me/8801990906688" target="_blank" rel="noreferrer" className="font-semibold text-green-600 hover:underline">WhatsApp</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">Facebook</a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-heading">বিভাগ</h4>
          <ul className="space-y-2">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/books/search?category=${c.slug}`} className="text-sm text-body transition-colors hover:text-accent">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-heading">সহায়তা</h4>
          <ul className="space-y-2">
            {HELP.map((h) => (
              <li key={h.href}>
                <Link href={h.href} className="text-sm text-body transition-colors hover:text-accent">
                  {h.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-heading">যোগাযোগ</h4>
          <ul className="space-y-2 text-sm text-body">
            <li>📍 ধানমন্ডি, ঢাকা ১২০৫</li>
            <li>📞 <a href="tel:01556436147" className="hover:text-accent">01556 436147</a></li>
            <li>✉️ <a href="mailto:indobanglabook@gmail.com" className="hover:text-accent">indobanglabook@gmail.com</a></li>
          </ul>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-border-100">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-body sm:flex-row sm:px-8 lg:px-12">
          <span>© {new Date().getFullYear()} IndoBangla. সর্বস্বত্ব সংরক্ষিত।</span>
          <div className="flex items-center gap-3">
            <span>🔒 নিরাপদ পেমেন্ট</span>
            <span className="font-semibold text-pink-600">bKash</span>
            <span className="font-semibold text-orange-600">Nagad</span>
            <span className="font-semibold">COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
