import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import Uploader from '@/components/ui/forms/uploader';
import { toast } from 'react-toastify';

/**
 * Mode A — customer book resell. Pick a book you bought, set a price (≤ IndoBangla
 * price), choose condition, upload photos, choose who delivers. It goes to the
 * admin for approval; once sold, your wallet balance is credited.
 */

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const CONDITIONS: { key: string; label: string }[] = [
  { key: 'like_new', label: 'প্রায় নতুন' },
  { key: 'good', label: 'ভালো কন্ডিশন' },
  { key: 'used', label: 'ব্যবহৃত' },
  { key: 'readable', label: 'পড়ার যোগ্য' },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'অপেক্ষমাণ', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'লাইভ', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'বাতিল', cls: 'bg-red-100 text-red-700' },
  sold: { label: 'বিক্রি হয়েছে', cls: 'bg-teal-100 text-teal-700' },
};

export default function ResellDashboard() {
  const qc = useQueryClient();
  const { data: mine } = useQuery(['resell-my-books'], () => HttpClient.get<any>('resell/my-books'));
  const { data: eligible } = useQuery(['resell-eligible'], () => HttpClient.get<any>('resell/eligible'));

  const books: any[] = (eligible as any)?.data ?? [];
  const listings: any[] = (mine as any)?.data ?? [];
  const balance = (mine as any)?.wallet_balance ?? 0;

  const [bookId, setBookId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [condition, setCondition] = useState('like_new');
  const [images, setImages] = useState<any[]>([]);
  const [delivery, setDelivery] = useState('self');
  const [saving, setSaving] = useState(false);

  const selected = books.find((b) => String(b.id) === bookId);
  // The cap is IndoBangla's *effective* selling price — the sale price when the book is
  // on offer, otherwise the regular one. The server enforces exactly this, and showing
  // the regular price here promised a ceiling the server then rejected.
  const cap = selected ? Number(selected.sale_price || selected.price) : 0;

  const submit = async () => {
    if (!selected) return toast.error('একটি বই নির্বাচন করুন।');
    if (!price || Number(price) < 1) return toast.error('দাম দিন।');
    if (Number(price) > cap) return toast.error(`দাম ৳${Math.round(cap)} এর বেশি হতে পারবে না।`);
    if (!images.length) return toast.error('অন্তত একটি ছবি দিন।');
    setSaving(true);
    try {
      const res: any = await HttpClient.post('resell/create', {
        original_id: selected.id,
        price: Number(price),
        condition,
        images: images.map((im) => ({ original: im.original, thumbnail: im.thumbnail })),
        delivery_by: delivery,
      });
      // Marvel renders thrown exceptions as { errors:[{message}] } with HTTP 200.
      if (res?.errors?.length) {
        toast.error(res.errors[0]?.message || 'জমা দেওয়া যায়নি।');
        return;
      }
      toast.success('রিসেল লিস্টিং জমা হয়েছে — অ্যাডমিন অনুমোদন করলে লাইভ হবে।');
      setBookId(''); setPrice(''); setImages([]); setCondition('like_new'); setDelivery('self');
      qc.invalidateQueries(['resell-my-books']);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'জমা দেওয়া যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <div className="space-y-6">
      {/* wallet */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-accent to-accent-hover p-5 text-white">
        <div>
          <div className="text-xs opacity-80">আপনার রিসেল ব্যালান্স</div>
          <div className="mt-1 text-3xl font-bold">{bdt(balance)}</div>
        </div>
        <div className="max-w-[200px] text-right text-xs opacity-90">
          বই বিক্রি হলে এখানে টাকা যোগ হবে — যা দিয়ে পরের অর্ডার কিনতে পারবেন।
        </div>
      </div>

      {/* create form */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-heading">📚 বই রিসেলের জন্য যোগ করুন</h2>
        <p className="mb-4 text-sm text-gray-500">
          আপনার কেনা বই এখানে বিক্রির জন্য দিন। দাম IndoBangla-র দামের চেয়ে বেশি হতে পারবে না।
        </p>

        {books.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            রিসেল করার মতো কেনা বই পাওয়া যায়নি। আগে বই অর্ডার করলে সেগুলো এখানে দেখাবে।
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">কোন বই?</label>
              <select className={inputCls} value={bookId} onChange={(e) => { setBookId(e.target.value); setPrice(''); }}>
                <option value="">— বই নির্বাচন করুন —</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                আপনার দাম {selected ? `(সর্বোচ্চ ${bdt(cap)})` : ''}
              </label>
              <input type="number" className={inputCls} value={price} disabled={!selected}
                max={cap} placeholder={selected ? `${Math.round(cap)} বা কম` : 'আগে বই নির্বাচন করুন'}
                onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">বইয়ের অবস্থা</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <button key={c.key} type="button" onClick={() => setCondition(c.key)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${condition === c.key ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600 hover:border-accent'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">বইয়ের ছবি (আসল অবস্থা দেখান)</label>
              <Uploader multiple onChange={setImages} value={images} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">ডেলিভারি কে করবে?</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDelivery('self')}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${delivery === 'self' ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600 hover:border-accent'}`}>
                  আমি নিজে
                </button>
                <button type="button" onClick={() => setDelivery('indobangla')}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${delivery === 'indobangla' ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600 hover:border-accent'}`}>
                  IndoBangla (ঢাকায় ৳১২০)
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <button onClick={submit} disabled={saving}
                className="w-full rounded-lg bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60">
                {saving ? 'জমা হচ্ছে…' : 'রিসেলের জন্য জমা দিন'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* my listings */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-heading">আমার রিসেল বই</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-gray-500">এখনো কোনো বই রিসেলে দেননি।</p>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => {
              const st = STATUS[l.status] ?? STATUS.pending;
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-gray-100">
                    {l.image && <img src={l.image} alt={l.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-heading">{l.name}</div>
                    <div className="text-xs text-gray-400">
                      {bdt(l.price)} · {CONDITIONS.find((c) => c.key === l.condition)?.label ?? l.condition}
                      {l.buyer_name ? ` · ক্রেতা: ${l.buyer_name}` : ''}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
