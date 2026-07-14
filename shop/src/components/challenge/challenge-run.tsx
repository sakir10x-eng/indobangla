import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/framework/user';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { useCart } from '@/store/quick-cart/cart.context';
import {
  useChallengeStatus,
  useStartChallenge,
  CHALLENGE_STASH_KEY,
  CHALLENGE_COUPON_KEY,
} from '@/framework/challenge';

/** One tab at a time — a second tab that opens this page is told to close. */
const TAB_LOCK = 'ib_challenge_tab';

export default function ChallengeRun() {
  const router = useRouter();
  const { isAuthorized } = useUser();
  const { openModal } = useModalAction();
  const { items, resetCart } = useCart();

  const { status, refetch } = useChallengeStatus(isAuthorized);
  const { startChallenge, isStarting } = useStartChallenge();
  const [blocked, setBlocked] = useState(false);
  const [won, setWon] = useState<string | null>(null);

  const cfg = status?.config;

  // The customer lands back here when the minute ends. If a coupon was won, it's waiting.
  useEffect(() => {
    const code = localStorage.getItem(CHALLENGE_COUPON_KEY);
    if (code) setWon(code);
  }, [status?.pending]);

  // A second tab is not a second chance.
  useEffect(() => {
    const id = String(Date.now()) + Math.random();
    const existing = localStorage.getItem(TAB_LOCK);
    if (existing) {
      // A stale lock from a closed tab shouldn't wedge the page — it ages out.
      const age = Date.now() - Number(existing.split(':')[1] ?? 0);
      if (age < 5000) {
        setBlocked(true);
        return;
      }
    }
    const beat = setInterval(
      () => localStorage.setItem(TAB_LOCK, `${id}:${Date.now()}`),
      2000,
    );
    localStorage.setItem(TAB_LOCK, `${id}:${Date.now()}`);
    return () => {
      clearInterval(beat);
      const cur = localStorage.getItem(TAB_LOCK);
      if (cur?.startsWith(id)) localStorage.removeItem(TAB_LOCK);
    };
  }, []);

  function handleStart() {
    if (!isAuthorized) {
      openModal('LOGIN_VIEW');
      return;
    }
    // Park whatever was already in the cart. It must not ride the discount, and the
    // challenge cart should show only the books actually hunted down in the minute.
    if (items.length) {
      localStorage.setItem(CHALLENGE_STASH_KEY, JSON.stringify(items));
      resetCart();
    }
    startChallenge(undefined as any, {
      onSuccess: () => {
        refetch();
        router.push('/');
      },
    });
  }

  if (blocked) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-heading">চ্যালেঞ্জ অন্য একটি ট্যাবে খোলা আছে</h1>
        <p className="mt-2 text-sm text-body">
          একসাথে একাধিক ট্যাবে চ্যালেঞ্জ খেলা যায় না। অন্য ট্যাবটি বন্ধ করে এই পাতাটি রিফ্রেশ করুন।
        </p>
      </Shell>
    );
  }

  if (won) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-heading">🎉 চ্যালেঞ্জ শেষ!</h1>
        <p className="mt-3 text-sm text-body">
          আপনার ছাড় চেকআউটে নিজে থেকেই বসে যাবে — কোড লিখতে হবে না।
        </p>
        <p className="mt-1 text-xs text-muted">
          অর্ডার সম্পন্ন করলে বাজির পয়েন্ট ফেরত পাবেন। অর্ডার না করলে পয়েন্ট ফেরত পাবেন না, আর
          কুপনের মেয়াদ শেষ হয়ে যাবে।
        </p>
        <button
          onClick={() => router.push('/checkout')}
          className="mt-6 rounded-full bg-accent px-10 py-4 text-lg font-extrabold text-white shadow-lg hover:bg-accent-hover"
        >
          এখনই চেকআউট করুন →
        </button>
      </Shell>
    );
  }

  const maxBooks =
    cfg?.per_book_pct > 0 ? Math.ceil(cfg.cap_pct / cfg.per_book_pct) : 0;

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-heading">⏱️ ১ মিনিট বই চ্যালেঞ্জ</h1>
      <p className="mt-2 text-sm text-body">
        {cfg?.duration_sec ?? 60} সেকেন্ডে সার্চ ও ক্যাটাগরি ঘুরে যত <b>আলাদা</b> বই কার্টে দেবেন,
        তত বেশি ছাড়।
      </p>

      <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left text-sm text-body">
        <li>📚 প্রতিটি আলাদা বই = <b>{cfg?.per_book_pct ?? 1}% ছাড়</b></li>
        <li>🏆 সর্বোচ্চ <b>{cfg?.cap_pct ?? 10}% ছাড়</b> — অর্থাৎ {maxBooks} টি বই দিলেই সর্বোচ্চ</li>
        <li>
          🔍 বই নিতে হবে <b>বইয়ের নিজস্ব পেজ</b> থেকে — সার্চ বা ক্যাটাগরি ঘুরে খুঁজে বের করুন
        </li>
        <li>🚫 উইশলিস্ট, "একসাথে কেনা হয়" বান্ডল বা বইয়ের লিস্ট থেকে যোগ করা যাবে না</li>
        <li>1️⃣ প্রতিটি বইয়ের <b>মাত্র ১ কপি</b> নেওয়া যাবে</li>
        <li>🎯 শুরু করলেই ওয়ালেট থেকে <b>{cfg?.stake_points ?? 100} পয়েন্ট</b> বাজি রাখা হবে</li>
        <li>✅ অর্ডার সম্পন্ন করলে বাজির পয়েন্ট <b>ফেরত পাবেন</b></li>
        <li>❌ অর্ডার না করলে <b>পয়েন্ট ফেরত পাবেন না</b></li>
        <li>🛒 চ্যালেঞ্জের সময় কার্টে আগের বই দেখা যাবে না — অর্ডারের পর ফিরে আসবে</li>
        <li>🔒 একসাথে একাধিক ট্যাবে খেলা যাবে না</li>
        <li>📅 দিনে <b>{cfg?.daily_limit ?? 1} বার</b> খেলতে পারবেন</li>
      </ul>

      {status && (
        <p className="mt-6 text-sm text-body">
          আপনার ওয়ালেটে আছে <b className="text-heading">{status.points} পয়েন্ট</b>।
        </p>
      )}

      {status?.reason ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">
          {status.reason}
        </p>
      ) : (
        <button
          onClick={handleStart}
          disabled={isStarting}
          className="mt-6 rounded-full bg-accent px-10 py-4 text-lg font-extrabold text-white shadow-lg hover:bg-accent-hover disabled:opacity-60"
        >
          {isStarting ? 'শুরু হচ্ছে…' : 'চ্যালেঞ্জ শুরু করুন →'}
        </button>
      )}
      {!status?.reason && (
        <p className="mt-3 text-xs text-muted">
          শুরু করলেই ঘড়ি চালু — তারপর দোকানে ফিরে বই খুঁজতে থাকুন।
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-border-200 bg-light p-8 text-center">
        {children}
      </div>
    </div>
  );
}
