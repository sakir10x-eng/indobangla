import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import { toast } from 'react-toastify';

const REASONS = [
  { key: 'damaged', label: 'বইটি ছেঁড়া / ক্ষতিগ্রস্ত' },
  { key: 'wrong_book', label: 'ভুল বই এসেছে' },
  { key: 'missing_pages', label: 'পাতা নেই / ছাপা খারাপ' },
  { key: 'other', label: 'অন্য সমস্যা' },
];

/**
 * The exchange window on a delivered order: a live countdown, and a per-book
 * "report a problem" form. Report within 3 days or the window closes on its own.
 */
export default function ExchangeWindow({ orderId }: { orderId: number | string }) {
  const qc = useQueryClient();
  const { data } = useQuery(
    ['exchange-window', orderId],
    () => HttpClient.get<any>('exchange-window', { order_id: orderId }),
    { enabled: !!orderId },
  );

  const [openFor, setOpenFor] = useState<number | null>(null);
  const [type, setType] = useState('exchange');
  const [reason, setReason] = useState('damaged');
  const [note, setNote] = useState('');

  const { mutate, isLoading } = useMutation(
    (input: any) => HttpClient.post<any>('exchange-request', input),
    {
      onSuccess: (r: any) => {
        toast.success(r?.message || 'রিকোয়েস্ট জমা হয়েছে');
        setOpenFor(null);
        setNote('');
        qc.invalidateQueries(['exchange-window', orderId]);
      },
      onError: (e: any) => toast.error(e?.response?.data?.message || 'সমস্যা হয়েছে'),
    },
  );

  const w = (data as any)?.window;
  const items = (data as any)?.items ?? [];
  if (!w?.delivered) return null;

  return (
    <div className="mt-6 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-heading">↔ এক্সচেঞ্জ / রিটার্ন</h3>
        {w.open ? (
          <span className="rounded-full bg-[#e63946] px-2.5 py-0.5 text-[11px] font-bold text-white">
            {w.days_to_report > 0
              ? `আর ${w.days_to_report} দিন বাকি`
              : `আর ${w.hours_to_report} ঘণ্টা বাকি`}
          </span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">সময় শেষ</span>
        )}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-[#8a4048]">
        কোনো সমস্যা থাকলে <b>ডেলিভারির ৩ দিনের মধ্যে</b> জানাতে হবে; এক্সচেঞ্জ <b>৭ দিনের মধ্যে</b> শেষ হবে।
        {!w.open && (
          <>
            <br />
            <b>উইন্ডো বন্ধ</b> — {w.closed_reason === 'no problem was reported within 3 days'
              ? '৩ দিনের মধ্যে কোনো সমস্যা জানানো হয়নি।'
              : '৭ দিনের এক্সচেঞ্জ সময় শেষ হয়ে গেছে।'}
          </>
        )}
      </p>

      {w.open && (
        <div className="mt-3 space-y-2">
          {items.map((it: any) => (
            <div key={it.product_id} className="rounded-lg bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                {it.image && <img src={it.image} alt="" className="h-10 w-8 rounded object-cover" />}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">{it.name}</span>
                {it.is_resell ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                    রিসেল বই — এক্সচেঞ্জ/রিটার্ন নেই
                  </span>
                ) : it.request ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    ✓ রিকোয়েস্ট জমা ({it.request.status})
                  </span>
                ) : (
                  <button
                    onClick={() => setOpenFor(openFor === it.product_id ? null : it.product_id)}
                    className="rounded-full border border-[#e63946] px-3 py-1 text-[11px] font-bold text-[#e63946] hover:bg-[#fdf0f1]"
                  >
                    সমস্যা জানান
                  </button>
                )}
              </div>

              {openFor === it.product_id && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex gap-2">
                    {[
                      ['exchange', '↔ বদলে দিন'],
                      ['return', '↩ ফেরত নিন'],
                    ].map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setType(k)}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                          type === k ? 'bg-[#e63946] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#e63946]"
                  >
                    {REASONS.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="একটু বিস্তারিত লিখুন (ঐচ্ছিক)"
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-[#e63946]"
                  />
                  <button
                    disabled={isLoading}
                    onClick={() =>
                      mutate({
                        order_id: orderId,
                        product_id: it.product_id,
                        quantity: it.quantity,
                        type,
                        reason,
                        note,
                      })
                    }
                    className="w-full rounded-full bg-[#e63946] py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {isLoading ? 'পাঠানো হচ্ছে…' : 'রিকোয়েস্ট পাঠান'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
