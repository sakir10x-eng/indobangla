import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/framework/user';
import { useCart } from '@/store/quick-cart/cart.context';
import {
  useChallengeStatus,
  useFinishChallenge,
  challengeToken,
  CHALLENGE_TOKEN_KEY,
  CHALLENGE_STASH_KEY,
} from '@/framework/challenge';

/**
 * Rides along on every page while the minute is running: the clock, the running total, and
 * the way out. It also owns the parked cart — see restore() below.
 */
export default function ChallengeBar() {
  const router = useRouter();
  const { isAuthorized } = useUser();
  const { status, refetch } = useChallengeStatus(isAuthorized, true);
  const { finishChallenge, isFinishing } = useFinishChallenge();
  const { addItemsToCart } = useCart();

  const [secondsLeft, setSecondsLeft] = useState(0);
  const finishing = useRef(false);

  const cfg = status?.config;
  const active = status?.active;
  const live = Boolean(active) && secondsLeft > 0;

  useEffect(() => {
    if (active?.seconds_left != null) setSecondsLeft(active.seconds_left);
  }, [active?.seconds_left]);

  useEffect(() => {
    if (!active || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [active, secondsLeft]);

  // Minute's up — cash in whatever was collected, without waiting to be asked.
  useEffect(() => {
    if (active && secondsLeft === 0 && !finishing.current) {
      finishing.current = true;
      finish().then(() => router.push('/challenge'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, active]);

  /**
   * Give the customer their old cart back.
   *
   * The books they had before the challenge are parked at kickoff so they can't ride the
   * discount, and so the challenge cart shows only what was actually hunted down. They come
   * back once the run is settled — whether that ended in an order or in nothing.
   */
  useEffect(() => {
    if (!status || status.pending) return;

    // Run is over; a token left behind means the tab was closed mid-run.
    if (challengeToken()) localStorage.removeItem(CHALLENGE_TOKEN_KEY);

    const parked = localStorage.getItem(CHALLENGE_STASH_KEY);
    if (!parked) return;
    try {
      const items = JSON.parse(parked);
      if (Array.isArray(items) && items.length) addItemsToCart(items);
    } catch {
      /* a corrupt stash is not worth breaking the page over */
    }
    localStorage.removeItem(CHALLENGE_STASH_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.pending]);

  async function finish() {
    const token = challengeToken();
    if (!token) return;
    try {
      await finishChallenge({ token });
    } finally {
      refetch();
    }
  }

  if (!live || router.pathname === '/challenge') return null;

  const books = active?.books ?? 0;
  const pct = Math.min(books * (cfg?.per_book_pct ?? 1), cfg?.cap_pct ?? 10);
  const danger = secondsLeft <= 10;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-accent bg-light shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">সময়</p>
            <p
              className={`text-2xl font-extrabold tabular-nums ${
                danger ? 'animate-pulse text-red-600' : 'text-heading'
              }`}
            >
              {secondsLeft}s
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">বই</p>
            <p className="text-2xl font-extrabold text-heading">{books}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted">ছাড়</p>
            <p className="text-2xl font-extrabold text-accent">{pct}%</p>
          </div>
        </div>

        <p className="hidden flex-1 px-4 text-xs text-body md:block">
          বইয়ের নিজস্ব পেজ থেকে যোগ করুন — সার্চ ও ক্যাটাগরি ঘুরে যত <b>আলাদা</b> বই, তত ছাড়।
        </p>

        <button
          onClick={() => {
            finishing.current = true;
            finish().then(() => router.push('/challenge'));
          }}
          disabled={isFinishing}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          শেষ করে চেকআউট →
        </button>
      </div>
    </div>
  );
}
