import Link from '@/components/ui/link';
import { HttpClient } from '@/framework/client/http-client';
import { useSettings, useSubscription } from '@/framework/settings';
import { useState } from 'react';
import { useQuery } from 'react-query';

type Cat = { id: number; name: string; slug: string; count: number };

const HELP = [
  { name: 'সব বই', href: '/books/search' },
  { name: 'লেখক', href: '/authors' },
  { name: 'প্রকাশনী', href: '/manufacturers' },
  { name: 'আমার অর্ডার', href: '/orders' },
  { name: 'সাপোর্ট', href: '/help' },
  { name: 'রিটার্ন ও রিফান্ড', href: '/customer-refund-policies' },
];

const bn = (n: number | string) =>
  String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

const TRUST = [
  {
    title: 'দ্রুত ডেলিভারি',
    sub: 'সারা বাংলাদেশে',
    path: (
      <>
        <path d="M1 3h13v13H1z" /><path d="M14 8h4l3 3v5h-7" />
        <circle cx="6.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" />
      </>
    ),
  },
  {
    title: 'ক্যাশ অন ডেলিভারি',
    sub: 'হাতে পেয়ে পেমেন্ট',
    path: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" />
      </>
    ),
  },
  {
    title: '১০০% অরিজিনাল',
    sub: 'নিশ্চিত মানের বই',
    path: (
      <>
        <path d="M12 2l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V5z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    title: '৭ দিনের রিটার্ন',
    sub: 'ঝামেলাহীন ফেরত',
    path: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" />
      </>
    ),
  },
];

/** Newsletter box — posts through the same subscription hook the stock footer uses. */
function Newsletter() {
  const { mutate: subscribe, isLoading, isSubscribed } = useSubscription();
  const [email, setEmail] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) subscribe({ email: email.trim() });
      }}
      className="mt-5"
    >
      <label className="mb-2 block text-[14.5px] font-semibold text-[#f3efe7]">
        নতুন বই ও অফারের খবর সবার আগে পান
      </label>
      {isSubscribed ? (
        <p className="rounded-xl border border-white/10 bg-[#262523] px-4 py-3 text-sm text-green-400">
          ✓ ধন্যবাদ! আপনি সাবস্ক্রাইব করেছেন।
        </p>
      ) : (
        <div className="flex max-w-[340px] rounded-xl border border-white/10 bg-[#262523] p-1.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="আপনার ইমেইল লিখুন"
            aria-label="ইমেইল"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[#f3efe7] outline-none placeholder:text-[#79746c]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {isLoading ? '...' : 'সাবস্ক্রাইব'}
          </button>
        </div>
      )}
    </form>
  );
}

export default function IndoFooter() {
  const { settings } = useSettings();
  const contact = (settings as any)?.contactDetails ?? {};
  const socials: { url: string; icon: string }[] = contact?.socials ?? [];
  const address = contact?.location?.formattedAddress;

  // Real book categories, so a footer link never opens an empty results page.
  const { data } = useQuery(
    ['footer-book-categories'],
    () => HttpClient.get<any>('book-categories', { limit: 8 }),
    { staleTime: 30 * 60 * 1000 },
  );
  const cats: Cat[] = ((data as any)?.categories ?? []).slice(0, 6);

  const socialLabel = (icon: string) =>
    icon?.replace(/Icon$/, '') || 'Follow';

  return (
    <footer className="mt-10">
      {/* ===== trust strip ===== */}
      <div className="border-y border-border-100 bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((b) => (
            <div key={b.title} className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  {b.path}
                </svg>
              </span>
              <span>
                <b className="block text-[15px] font-bold leading-tight text-heading">{b.title}</b>
                <span className="mt-0.5 block text-[12.5px] text-body">{b.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== dark footer ===== */}
      <div className="bg-[#1c1b1a] text-[#f3efe7]">
        {/* book-spine colour bar */}
        <div className="flex h-[5px]">
          {['bg-accent', 'bg-[#c9a24b]', 'bg-[#3f7d6e]', 'bg-[#8a5a3b]', 'bg-[#4a5a7a]', 'bg-accent'].map((c, i) => (
            <i key={i} className={`flex-1 ${c}`} />
          ))}
        </div>

        <div className="mx-auto max-w-[1200px] px-6 pb-8 pt-14">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr] lg:gap-11">
            {/* brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="text-[26px] font-extrabold tracking-tight text-[#f3efe7]">
                Indo<span className="text-accent">Bangla</span>
              </div>
              <p className="mt-3.5 max-w-[34ch] text-[14.5px] leading-relaxed text-[#a49f95]">
                ভারতীয় অরিজিনাল ও বাংলাদেশের সেরা বই — ঘরে বসে অর্ডার করুন।
              </p>
              <Newsletter />
              {socials.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {socials.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#262523] px-3 py-2 text-[13.5px] font-semibold text-[#f3efe7] transition hover:border-accent hover:text-accent"
                    >
                      {socialLabel(s.icon)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* categories */}
            <div>
              <h4 className="relative mb-4 pb-3 text-[15px] font-semibold text-[#f3efe7] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-6 after:rounded after:bg-accent">
                বিভাগ
              </h4>
              <ul className="flex flex-col gap-3">
                {cats.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/books/search?category=${c.slug}`}
                      className="text-[14.5px] text-[#a49f95] transition hover:text-[#f3efe7]"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* help */}
            <div>
              <h4 className="relative mb-4 pb-3 text-[15px] font-semibold text-[#f3efe7] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-6 after:rounded after:bg-accent">
                সহায়তা
              </h4>
              <ul className="flex flex-col gap-3">
                {HELP.map((h) => (
                  <li key={h.href}>
                    <Link href={h.href} className="text-[14.5px] text-[#a49f95] transition hover:text-[#f3efe7]">
                      {h.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* contact */}
            <div>
              <h4 className="relative mb-4 pb-3 text-[15px] font-semibold text-[#f3efe7] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-6 after:rounded after:bg-accent">
                যোগাযোগ
              </h4>
              <ul className="flex flex-col gap-3.5 text-[14.5px] text-[#a49f95]">
                {address && <li className="leading-relaxed">📍 {address}</li>}
                {contact?.contact && (
                  <li>
                    📞{' '}
                    <a href={`tel:${contact.contact}`} className="transition hover:text-[#f3efe7]">
                      {bn(contact.contact)}
                    </a>
                  </li>
                )}
                {contact?.emailAddress && (
                  <li className="break-all">
                    ✉️{' '}
                    <a href={`mailto:${contact.emailAddress}`} className="transition hover:text-[#f3efe7]">
                      {contact.emailAddress}
                    </a>
                  </li>
                )}
              </ul>
              <div className="mt-5 flex flex-col gap-2.5">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
                >
                  যোগাযোগ করুন
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-[#262523] px-4 py-2.5 text-sm font-bold text-[#f3efe7] transition hover:border-accent hover:text-accent"
                >
                  সাপোর্ট
                </Link>
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div className="mt-11 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <div className="text-[13px] text-[#8b867d]">
              © {bn(new Date().getFullYear())}{' '}
              <strong className="font-bold text-[#f3efe7]">IndoBangla</strong> · সর্বস্বত্ব সংরক্ষিত
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#a49f95]">
                🔒 নিরাপদ পেমেন্ট
              </span>
              {/* Only the methods checkout actually offers — see the pay-link method list. */}
              <span className="rounded-md border border-white/10 bg-[#262523] px-3 py-1.5 text-xs font-bold text-[#e2136e]">bKash</span>
              <span className="rounded-md border border-white/10 bg-[#262523] px-3 py-1.5 text-xs font-bold text-[#f3efe7]">Bank</span>
              <span className="rounded-md border border-white/10 bg-[#262523] px-3 py-1.5 text-xs font-bold text-[#f3efe7]">COD</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
