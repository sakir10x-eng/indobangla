import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from '@/components/ui/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useFeatureRegistryQuery } from '@/data/integrations';

/**
 * Feature Registry & Impact — admin dashboard.
 *
 * The visual shell comes from the uploaded "feature-analytics-dashboard" design, but every
 * row here is driven by the REAL backend registry (GET /feature-registry → FeatureRegistry.php),
 * which runs a live probe per feature (its table / column / setting / token really exists).
 *
 * Honesty note: the original mock design showed per-feature usage %, effectiveness scores and
 * traffic-lift figures. We do not track those yet, so we do NOT fabricate them here — the
 * "impact" a feature shows is its live health probe, which is real. When usage tracking lands,
 * the metric strip can be wired to it.
 */

type Status = 'ok' | 'warn' | 'fail';

interface Feature {
  key: string;
  name: string;
  detail?: string | null;
  area?: string;
  version?: string;
  date?: string | null;
  admin?: string | null;
  status: Status;
  note?: string | null;
}

const STATUS_BN: Record<Status, string> = {
  ok: 'ঠিক আছে',
  warn: 'নজর দিন',
  fail: 'সমস্যা',
};
const PILL_BN: Record<Status, string> = {
  ok: 'সক্রিয়',
  warn: 'নজর দিন',
  fail: 'সমস্যা',
};
const PROBE_BN: Record<Status, string> = {
  ok: 'PASS',
  warn: 'WARN',
  fail: 'FAIL',
};

type FilterKey = 'all' | Status | string; // status keys or `area:<name>`

export default function FeaturesPage() {
  const { features, counts, checkedAt, loading, refetch, isFetching } =
    useFeatureRegistryQuery();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterKey>('all');

  const areas: string[] = useMemo(() => {
    const set = new Set<string>();
    (features as Feature[]).forEach((f) => f.area && set.add(f.area));
    return Array.from(set).sort();
  }, [features]);

  const shown: Feature[] = useMemo(() => {
    const list = features as Feature[];
    if (filter === 'all') return list;
    if (filter === 'ok' || filter === 'warn' || filter === 'fail') {
      return list.filter((f) => f.status === filter);
    }
    if (filter.startsWith('area:')) {
      const a = filter.slice(5);
      return list.filter((f) => f.area === a);
    }
    return list;
  }, [features, filter]);

  const total = counts.total ?? (features as Feature[]).length;
  const healthy = counts.ok ?? 0;
  const warn = counts.warn ?? 0;
  const fail = counts.fail ?? 0;
  const score = total ? Math.round((healthy / total) * 100) : 0;

  return (
    <div className="freg pb-16">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .freg {
          --red: #e63946;
          --char: #333132;
          --char2: #5a585a;
          --char3: #8c8a8c;
          --line: #e8e4de;
          --card: #ffffff;
          --ok: #2e8b57;
          --okbg: #eaf6ef;
          --warn: #b7791f;
          --warnbg: #fdf6e7;
          --bad: #c0392b;
          --badbg: #fbeae8;
          --dim: #9c999c;
        }
        .freg .mono {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .freg .pip {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex: none;
          position: relative;
          display: inline-block;
        }
        .freg .pip.ok {
          background: var(--ok);
        }
        .freg .pip.warn {
          background: var(--warn);
        }
        .freg .pip.bad {
          background: var(--bad);
        }
        .freg .pip.live::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          opacity: 0;
          animation: freg-pulse 2.2s ease-out infinite;
        }
        .freg .pip.live.ok::after {
          color: var(--ok);
        }
        .freg .pip.live.warn::after {
          color: var(--warn);
        }
        @keyframes freg-pulse {
          0% {
            transform: scale(0.7);
            opacity: 0.9;
          }
          70% {
            transform: scale(2.1);
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        .freg .beat {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          display: inline-block;
          animation: freg-beat 1.6s ease-in-out infinite;
        }
        @keyframes freg-beat {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
        .freg .caret {
          display: inline-block;
          transition: transform 0.2s;
        }
        .freg .caret.open {
          transform: rotate(90deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .freg .pip.live::after,
          .freg .beat {
            animation: none;
          }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-bold tracking-tight text-slate-800" style={{ fontSize: 26 }}>
            🧩 ফিচার রেজিস্ট্রি ও ইমপ্যাক্ট
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            প্রতিটি ফিচার <b>সত্যিকারের প্রোব</b> দিয়ে যাচাই হয় (টেবিল / কলাম / সেটিং / টোকেন আছে কি না)।
            কোনোটা কাজ করতে না পারলে <b className="text-rose-600">লাল</b> দেখাবে।
          </p>
          {checkedAt && (
            <p className="mono mt-1.5 text-[11px] text-slate-400">
              শেষ চেক: {new Date(checkedAt).toLocaleString('en-GB')} · লাইভ হেলথ, প্রতি ৬০সে
            </p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition hover:bg-[#e63946] hover:text-white disabled:opacity-50"
          style={{ borderColor: '#e63946', color: '#e63946' }}
        >
          {isFetching ? 'চেক হচ্ছে…' : '↻ আবার চেক করুন'}
        </button>
      </header>

      {/* ── Scoreboard ─────────────────────────────────────── */}
      <div
        className="mb-3 grid gap-px overflow-hidden rounded-2xl border"
        style={{
          background: 'var(--line)',
          borderColor: 'var(--line)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}
      >
        <Cell k="পোর্টফোলিও স্কোর" hero>
          <span style={{ color: '#e63946' }}>{score}</span>
          <span className="text-[15px] text-slate-400">/100</span>
          <div className="mono mt-0.5 text-[11px] text-slate-400">{total} ফিচার</div>
        </Cell>
        <Cell k="মোট ফিচার" v={String(total)} note="নিবন্ধিত" />
        <Cell k="ঠিক আছে" v={String(healthy)} tone="ok" note="সব প্রোব পাস" />
        <Cell k="নজর দিন" v={String(warn)} tone="warn" note="আংশিক কাজ করছে" />
        <Cell k="সমস্যা" v={String(fail)} tone={fail ? 'bad' : 'dim'} note="প্রোব ফেল" />
        <Cell k="এরিয়া" v={String(areas.length)} note="ফিচার গ্রুপ" />
      </div>

      {/* ── Honest data-source note ────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2 px-0.5 text-[12.5px] text-slate-500">
        <span
          className="inline-block h-[7px] w-[7px] rounded-full"
          style={{ background: 'var(--ok)', boxShadow: '0 0 0 3px var(--okbg)' }}
        />
        <b>লাইভ ডেটা</b>
        <span>·</span>
        <code className="mono rounded border bg-white px-1.5 py-px text-[11px]" style={{ borderColor: 'var(--line)' }}>
          GET /feature-registry
        </code>
        <span className="text-slate-400">
          · সংখ্যাগুলো ফিচারের <b>হেলথ-প্রোব</b> থেকে — ব্যবহার/ট্রাফিক অ্যানালিটিক্স এখনো ট্র্যাক করা হয় না।
        </span>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          সব ({total})
        </Chip>
        <Chip active={filter === 'ok'} onClick={() => setFilter('ok')}>
          ঠিক আছে ({healthy})
        </Chip>
        <Chip active={filter === 'warn'} onClick={() => setFilter('warn')}>
          নজর দিন ({warn})
        </Chip>
        <Chip active={filter === 'fail'} onClick={() => setFilter('fail')}>
          সমস্যা ({fail})
        </Chip>
        {areas.length > 0 && <span className="mx-1 h-5 w-px" style={{ background: 'var(--line)' }} />}
        {areas.map((a) => (
          <Chip key={a} active={filter === `area:${a}`} onClick={() => setFilter(`area:${a}`)}>
            {a}
          </Chip>
        ))}
      </div>

      {/* ── Rows ───────────────────────────────────────────── */}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">লোড হচ্ছে…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">এই ফিল্টারে কোনো ফিচার নেই।</p>
      ) : (
        <div className="space-y-2.5">
          {shown.map((f) => (
            <Row key={f.key} f={f} open={!!open[f.key]} onToggle={() => setOpen((o) => ({ ...o, [f.key]: !o[f.key] }))} />
          ))}
        </div>
      )}

      {/* ── Footnote ───────────────────────────────────────── */}
      <div
        className="mt-6 rounded-xl border bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-500"
        style={{ borderColor: 'var(--line)' }}
      >
        <b className="text-slate-700">নতুন ফিচার যোগ করলে:</b> API-র{' '}
        <code className="mono rounded bg-white px-1.5 py-0.5 text-[11px]">FeatureRegistry.php</code> ফাইলে একটা
        এন্ট্রি যোগ করুন (নাম, ভার্সন, তারিখ, area, admin লিংক, আর একটা <b>সত্যিকারের check</b>)। তাহলে সেটা এখানে
        চলে আসবে আর লাইভ হেলথ চেক হবে।
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── row */
function Row({ f, open, onToggle }: { f: Feature; open: boolean; onToggle: () => void }) {
  const s = f.status;
  const pipCls = s === 'ok' ? 'pip ok live' : s === 'warn' ? 'pip warn live' : 'pip bad';
  const badge =
    s === 'ok'
      ? { bg: 'var(--okbg)', c: 'var(--ok)' }
      : s === 'warn'
        ? { bg: 'var(--warnbg)', c: 'var(--warn)' }
        : { bg: 'var(--badbg)', c: 'var(--bad)' };
  const rowBorder = s === 'fail' ? '#f0c9c4' : s === 'warn' ? '#f0dfb8' : 'var(--line)';

  return (
    <article
      className="overflow-hidden rounded-xl border bg-white"
      style={{
        borderColor: rowBorder,
        boxShadow: '0 1px 2px rgba(51,49,50,.05), 0 8px 24px -16px rgba(51,49,50,.35)',
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <i className={pipCls} style={{ color: badge.c }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-bold tracking-tight text-slate-800">{f.name}</span>
            {f.version && <span className="mono text-[11px] text-slate-400">v{f.version}</span>}
            {f.area && (
              <span className="rounded border px-1.5 py-px text-[11px] text-slate-500" style={{ borderColor: 'var(--line)' }}>
                {f.area}
              </span>
            )}
            <span
              className="rounded px-2 py-0.5 text-[11px] font-bold"
              style={{ background: badge.bg, color: badge.c }}
            >
              {STATUS_BN[s]}
            </span>
            <span
              className="mono inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide"
              style={{ background: badge.bg, color: badge.c }}
            >
              {s !== 'fail' && <i className="beat" />}
              {PILL_BN[s]}
            </span>
          </div>
          {f.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{f.detail}</p>}
        </div>
        <span
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold text-slate-500 sm:inline-flex"
          style={{ borderColor: 'var(--line)' }}
        >
          <span className={`caret${open ? ' open' : ''}`}>▸</span> {open ? 'বন্ধ' : 'খুলুন'}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 py-4" style={{ borderColor: 'var(--line)', background: '#fcfbf9' }}>
          <div className="grid gap-6 md:grid-cols-2">
            {/* health probe — the real "impact" signal */}
            <div>
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">হেলথ প্রোব</p>
              <div
                className="flex items-center gap-2.5 border-b py-2 text-[12.5px]"
                style={{ borderColor: 'var(--line)', borderBottomStyle: 'dashed' }}
              >
                <i
                  className={s === 'ok' ? 'pip ok' : s === 'warn' ? 'pip warn' : 'pip bad'}
                  style={{ color: badge.c }}
                />
                <code className="mono text-[11.5px] text-slate-600">{f.note || 'probe ঠিক আছে'}</code>
                <span className="mono ml-auto text-[11px] font-bold" style={{ color: badge.c }}>
                  {PROBE_BN[s]}
                </span>
              </div>
              {s === 'fail' && (
                <div
                  className="mt-3 rounded-lg border-l-2 bg-white p-3 text-[12.5px] text-slate-600"
                  style={{ borderLeftColor: 'var(--bad)', border: '1px solid var(--line)', borderLeft: '3px solid var(--bad)' }}
                >
                  <b className="text-slate-700">এই ফিচার এখন কাজ করছে না।</b> প্রোব ফেল করেছে — লাইভে যাওয়ার আগে ঠিক করুন।
                </div>
              )}
              {s === 'warn' && (
                <div
                  className="mt-3 rounded-lg bg-white p-3 text-[12.5px] text-slate-600"
                  style={{ border: '1px solid var(--line)', borderLeft: '3px solid var(--warn)' }}
                >
                  কাজ করছে, তবে নজর দেওয়া দরকার।
                </div>
              )}
            </div>

            {/* metadata */}
            <div>
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">বিস্তারিত</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-slate-400">key</dt>
                <dd className="mono m-0 text-[12.5px] font-semibold text-slate-600">{f.key}</dd>
                <dt className="text-slate-400">ভার্সন</dt>
                <dd className="mono m-0 text-[12.5px] font-semibold text-slate-600">v{f.version || '1.0.0'}</dd>
                <dt className="text-slate-400">area</dt>
                <dd className="mono m-0 text-[12.5px] font-semibold text-slate-600">{f.area || '—'}</dd>
                {f.date && (
                  <>
                    <dt className="text-slate-400">রিলিজ</dt>
                    <dd className="mono m-0 text-[12.5px] font-semibold text-slate-600">{f.date}</dd>
                  </>
                )}
              </dl>
              {f.admin && (
                <Link
                  href={f.admin}
                  className="mt-4 inline-flex rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:border-[#e63946] hover:text-[#e63946]"
                  style={{ borderColor: 'var(--line)' }}
                >
                  সেটিংস খুলুন →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ──────────────────────────────────────────────────────────── bits */
function Cell({
  k,
  v,
  note,
  tone,
  hero,
  children,
}: {
  k: string;
  v?: string;
  note?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'dim';
  hero?: boolean;
  children?: ReactNode;
}) {
  const toneColor =
    tone === 'ok'
      ? 'var(--ok)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'bad'
          ? 'var(--bad)'
          : tone === 'dim'
            ? 'var(--char3)'
            : 'var(--char)';
  return (
    <div className="bg-white px-4 py-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{k}</div>
      {children ? (
        <div className="mono mt-0.5 text-[24px] font-bold leading-tight">{children}</div>
      ) : (
        <>
          <div className="mono mt-0.5 text-[24px] font-bold leading-tight" style={{ color: toneColor }}>
            {v}
          </div>
          {note && <div className="text-[11.5px] text-slate-400">{note}</div>}
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-[13px] font-semibold transition"
      style={
        active
          ? { background: 'var(--char)', borderColor: 'var(--char)', color: '#fff' }
          : { background: '#fff', borderColor: 'var(--line)', color: 'var(--char2)' }
      }
    >
      {children}
    </button>
  );
}

FeaturesPage.authenticate = { permissions: adminOnly };
FeaturesPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: { ...(await serverSideTranslations(locale, ['form', 'common', 'table'])) },
});
