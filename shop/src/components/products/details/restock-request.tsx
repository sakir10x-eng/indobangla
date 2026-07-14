import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import { toast } from 'react-toastify';
import { useUser } from '@/framework/user';

/**
 * Out-of-stock book → ask us to bring it back.
 * 3 free requests. Once 3 confirmed books are still un-ordered, each further request
 * costs 10 wallet points — and we say so *before* they press the button.
 */
export default function RestockRequest({ productId }: { productId: number }) {
  const { isAuthorized } = useUser();
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data } = useQuery(['restock-mine'], () => HttpClient.get<any>('restock-mine'), {
    enabled: isAuthorized,
  });
  const quota = (data as any)?.quota;
  const mine = (data as any)?.data ?? [];
  const already = mine.find((r: any) => Number(r.product_id) === Number(productId));

  const { mutate, isLoading } = useMutation(
    (input: any) => HttpClient.post<any>('restock-request', input),
    {
      onSuccess: (r: any) => {
        toast.success(r?.message || 'রিকোয়েস্ট জমা হয়েছে');
        qc.invalidateQueries(['restock-mine']);
      },
      onError: (e: any) => toast.error(e?.response?.data?.message || 'সমস্যা হয়েছে'),
    },
  );

  if (!isAuthorized) {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-body">
        বইটি এখন স্টকে নেই। <b>লগইন করে</b> রিস্টক রিকোয়েস্ট করুন — বইটি আনা গেলে আপনাকে জানাব।
      </div>
    );
  }

  if (already) {
    const label: Record<string, string> = {
      requested: '⏳ রিকোয়েস্ট জমা আছে — আমরা দেখছি',
      confirmed: '✅ বইটি আনা যাবে! প্রি-অর্ডার কনফার্ম করতে (৫০% অগ্রিম) দিয়ে অর্ডার কনফার্ম করুন।',
      ordered: '🎉 আপনি বইটি অর্ডার করেছেন',
      declined: '❌ দুঃখিত, এই বইটি আনা যাচ্ছে না',
    };
    return (
      <div className="mt-4 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1] p-4 text-sm font-semibold text-[#8a4048]">
        {label[already.status] ?? already.status}
        {already.expected_date && already.status !== 'declined' && (
          <div className="mt-1.5 text-[12px] font-semibold text-[#1f7a52]">
            📅 আনুমানিক {already.expected_date}-এর মধ্যে আসবে
            {already.eta_days ? ` (প্রায় ${already.eta_days} দিন)` : ''}
          </div>
        )}
        {already.admin_note && <div className="mt-1 text-[12px] font-normal">{already.admin_note}</div>}
      </div>
    );
  }

  const costs = quota?.costs_points;
  const points = quota?.points_per_request ?? 10;
  const wallet = quota?.wallet_points ?? 0;

  return (
    <div className="mt-4 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1] p-4">
      <div className="text-sm font-bold text-[#8a4048]">📦 বইটি এখন স্টকে নেই</div>

      {costs ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#8a4048]">
          ⚠️ আপনার <b>৩টি ফ্রি রিকোয়েস্ট শেষ</b> — কনফার্ম করা বইগুলো এখনো অর্ডার করেননি।
          এখন প্রতিটি রিকোয়েস্টে <b>{points} পয়েন্ট</b> কাটা যাবে (আপনার আছে <b>{wallet}</b> পয়েন্ট)।
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#8a4048]">
          আমাদের বলুন — বইটি আনার চেষ্টা করব। আনা গেলে দাম জানিয়ে দেব, তখন <b>৫০% অগ্রিমে</b> অর্ডার করতে পারবেন।
          <br />
          <span className="text-[12px]">আপনার <b>{quota?.free_left ?? 3}টি</b> ফ্রি রিকোয়েস্ট বাকি আছে।</span>
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="নোট (ঐচ্ছিক) — কোন সংস্করণ, ভাষা বা বিশেষ কিছু চাইলে লিখুন"
        className="mt-3 w-full rounded-lg border border-[#f4c4c8] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#e63946]"
      />

      <button
        disabled={isLoading || (costs && wallet < points)}
        onClick={() => {
          if (costs && !confirm(`এই রিকোয়েস্টে ${points} পয়েন্ট কাটা যাবে। চালিয়ে যাবেন?`)) return;
          mutate({ product_id: productId, note: note || undefined });
        }}
        className="mt-3 w-full rounded-full bg-[#e63946] py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {isLoading
          ? 'পাঠানো হচ্ছে…'
          : costs
            ? `${points} পয়েন্ট দিয়ে রিস্টক রিকোয়েস্ট করুন`
            : '🔄 রিস্টক রিকোয়েস্ট করুন'}
      </button>
      {costs && wallet < points && (
        <p className="mt-1.5 text-[12px] font-semibold text-[#b06068]">পর্যাপ্ত পয়েন্ট নেই।</p>
      )}
    </div>
  );
}
