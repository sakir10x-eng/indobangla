import { useState } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';

/**
 * Delivery area, autocompleted from RedX's own area list. The customer types, we suggest,
 * they pick — so the area stored on the order is one the courier definitely recognises
 * and a shipment can never fail on an area mismatch.
 */
export default function AreaPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [term, setTerm] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(Boolean(value));
  // `custom` = the customer typed an area that is not in the courier's list.
  const [custom, setCustom] = useState(false);

  const q = term.trim();
  const { data, isFetching } = useQuery(
    ['courier-areas', q],
    () => HttpClient.get<any>('courier-areas', { q }),
    { enabled: q.length > 1 && !picked, keepPreviousData: true },
  );
  const areas: any[] = (data as any)?.data ?? [];

  const useAsOtherArea = () => {
    if (!q) return;
    onChange(q);
    setPicked(true);
    setCustom(true);
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Plain words only. The customer does not know the courier keeps a list,
          and should never have to care — they just say where they live. */}
      <label className="block text-sm font-semibold leading-none text-body-dark">
        আপনার এলাকা
      </label>
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setPicked(false);
          setCustom(false);
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        placeholder="এলাকার নাম লিখুন — যেমন: ধানমন্ডি, মিরপুর ১০, উত্তরা"
        className="mt-1 h-12 w-full rounded border border-border-base px-4 text-sm focus:border-accent focus:outline-none"
        autoComplete="off"
      />

      {picked ? (
        custom ? (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            ✓ ঠিক আছে — আমরা এই এলাকায় পৌঁছে দেব।
          </p>
        ) : (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            ✓ এলাকা নির্বাচন করা হয়েছে
          </p>
        )
      ) : (
        <p className="mt-1 text-[11px] text-gray-400">
          নাম লিখতে শুরু করলে নিচে এলাকার তালিকা আসবে — সেখান থেকে বেছে নিন।
        </p>
      )}

      {open && !picked && q.length > 1 && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border-200 bg-white shadow-xl">
          {isFetching && areas.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">খোঁজা হচ্ছে…</div>
          )}
          {!isFetching && areas.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">
              এই নামে কোনো এলাকা পাওয়া যায়নি — নিচের বোতামে চাপ দিন।
            </div>
          )}
          {areas.map((a: any, i: number) => (
            <button
              key={`${a.id}-${i}`}
              type="button"
              onClick={() => {
                setTerm(a.name);
                onChange(a.name);
                setPicked(true);
                setCustom(false);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[#fdf0f1]"
            >
              <span className="font-medium text-heading">{a.name}</span>
              {a.district ? <span className="ml-2 text-xs text-gray-400">{a.district}</span> : null}
            </button>
          ))}

          {/* The escape hatch. Framed as the customer confirming where they live —
              NOT as "your area is missing from our courier's list", which is our
              problem, not theirs, and which read as an error to real customers. */}
          {!isFetching && (
            <button
              type="button"
              onClick={useAsOtherArea}
              className="block w-full border-t border-border-200 bg-emerald-50 px-3 py-2.5 text-left hover:bg-emerald-100"
            >
              <span className="text-sm font-semibold text-emerald-800">
                ✔ আমার এলাকা “{q}” — এটাই রাখুন
              </span>
              <span className="mt-0.5 block text-[11px] text-emerald-700">
                তালিকায় না পেলেও সমস্যা নেই, আমরা পৌঁছে দেব।
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
