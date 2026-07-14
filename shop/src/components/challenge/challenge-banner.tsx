import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import { HttpClient } from '@/framework/client/http-client';

/**
 * Home-page pitch for the 1-minute challenge.
 *
 * Reads the public rules endpoint, so guests see it too — and hides itself entirely when
 * the admin has the challenge switched off, rather than advertising a game nobody can play.
 */
export default function ChallengeBanner() {
  const router = useRouter();
  const { data } = useQuery(['challenge-info'], () =>
    HttpClient.get<any>('challenge-info'),
  );
  const cfg = data as any;

  if (!cfg?.enabled) return null;

  const maxBooks =
    cfg.per_book_pct > 0 ? Math.ceil(cfg.cap_pct / cfg.per_book_pct) : 0;

  return (
    <div className="mx-auto my-6 w-full max-w-[1720px] px-4">
      <div className="relative overflow-hidden rounded-2xl border border-[#f4c4c8] bg-gradient-to-br from-[#fdf0f1] via-[#fef7f2] to-[#fdf0f1] p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-6 -top-8 select-none text-[140px] leading-none opacity-[0.07]">
          ⏱️
        </span>

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-[#e63946] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              🔥 নতুন গেম
            </span>

            <h2 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
              ১ মিনিট বই চ্যালেঞ্জ — যত বই, তত ছাড়!
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
              ঘড়ি চালু হলে <b>{cfg.duration_sec} সেকেন্ড</b> সময়। সার্চ ও ক্যাটাগরি ঘুরে যত{' '}
              <b>আলাদা</b> বই কার্টে দেবেন, প্রতিটিতে <b>{cfg.per_book_pct}% ছাড়</b> —{' '}
              {maxBooks}টি বই দিলেই সর্বোচ্চ{' '}
              <b className="text-accent">{cfg.cap_pct}% ছাড়</b>।
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-body">
              <span>🎯 বাজি {cfg.stake_points} পয়েন্ট — অর্ডার করলেই ফেরত</span>
              <span>📅 দিনে {cfg.daily_limit} বার</span>
              <span>🔍 বই নিতে হবে বইয়ের নিজস্ব পেজ থেকে</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/challenge')}
            className="shrink-0 rounded-full bg-accent px-10 py-4 text-base font-extrabold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover"
          >
            Let&apos;s start →
          </button>
        </div>
      </div>
    </div>
  );
}
