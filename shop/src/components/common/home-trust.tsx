import { useQuery } from "react-query";
import { HttpClient } from "@/framework/client/http-client";

// Home social-proof block, built on REAL data: the store review count + average, a few real
// review quotes, and the store trust policies. Client-only + lazy (standard.tsx mounts it via
// dynamic ssr:false inside LazyOnView), so it never blocks first paint and never runs at build.
const bn = (v: number | string) => String(v ?? "").replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d as any]);

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${value} star`} className="text-[#f5a623]">
      {"★★★★★".slice(0, full)}<span className="text-gray-300">{"★★★★★".slice(full)}</span>
    </span>
  );
}

const BADGES = [
  { icon: "✅", text: "১০০% অরিজিনাল বই" },
  { icon: "🚚", text: "ক্যাশ অন ডেলিভারি" },
  { icon: "↩️", text: "৭ দিনে রিটার্ন" },
];

const HomeTrust: React.FC = () => {
  const { data } = useQuery(
    ["home-trust-reviews"],
    () => HttpClient.get<any>("reviews", { limit: 100, orderBy: "created_at", sortedBy: "desc" }),
    { staleTime: 10 * 60 * 1000, retry: 1 },
  );

  const list: any[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? list.length;
  if (!list.length) return null;

  const avg = list.reduce((s, r) => s + (Number(r?.rating) || 0), 0) / list.length;
  const quotes = list
    .filter((r) => typeof r?.comment === "string" && r.comment.trim().length > 15 && Number(r?.rating) >= 4)
    .slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-screen-xl px-4 py-8 md:py-10">
      <div className="rounded-2xl border border-[#e4e1dc] bg-[#fbf8f4] p-6 md:p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 text-2xl">
            <Stars value={avg} />
            <span className="text-xl font-bold text-[#333132]">{bn(avg.toFixed(1))}</span>
          </div>
          <p className="text-sm text-gray-600">
            {bn(total)}+ যাচাইকৃত পাঠকের রিভিউয়ের ভিত্তিতে
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {BADGES.map((b) => (
            <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e1dc] bg-white px-3 py-1.5 text-sm font-medium text-[#333132]">
              <span>{b.icon}</span> {b.text}
            </span>
          ))}
        </div>

        {quotes.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((r) => (
              <div key={r.id} className="rounded-xl bg-white p-4 shadow-sm">
                <Stars value={Number(r.rating) || 5} />
                <p className="mt-2 line-clamp-4 text-sm text-gray-700">{r.comment}</p>
                <p className="mt-2 text-xs font-medium text-gray-400">— যাচাইকৃত ক্রেতা</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeTrust;
