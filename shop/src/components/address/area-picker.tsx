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

  const q = term.trim();
  const { data, isFetching } = useQuery(
    ['courier-areas', q],
    () => HttpClient.get<any>('courier-areas', { q }),
    { enabled: q.length > 1 && !picked, keepPreviousData: true },
  );
  const areas: any[] = (data as any)?.data ?? [];

  return (
    <div className="relative">
      <label className="block text-sm font-semibold leading-none text-body-dark">ডেলিভারি এলাকা (কুরিয়ার এরিয়া)</label>
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setPicked(false);
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        placeholder="এলাকার নাম লিখুন — যেমন Dhanmondi, Mirpur…"
        className="mt-1 h-12 w-full rounded border border-border-base px-4 text-sm focus:border-accent focus:outline-none"
        autoComplete="off"
      />

      {picked ? (
        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
          ✓ কুরিয়ারের তালিকা থেকে বেছে নেওয়া হয়েছে
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-gray-400">
          লিখলে সাজেশন আসবে — <b>তালিকা থেকে বেছে নিন</b>, তাহলে কুরিয়ারে এরিয়া মিসম্যাচ হবে না।
        </p>
      )}

      {open && !picked && q.length > 1 && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border-200 bg-white shadow-xl">
          {isFetching && areas.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">খোঁজা হচ্ছে…</div>
          )}
          {!isFetching && areas.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">এই নামে কোনো এরিয়া পাওয়া যায়নি।</div>
          )}
          {areas.map((a: any, i: number) => (
            <button
              key={`${a.id}-${i}`}
              type="button"
              onClick={() => {
                setTerm(a.name);
                onChange(a.name);
                setPicked(true);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[#fdf0f1]"
            >
              <span className="font-medium text-heading">{a.name}</span>
              {a.district ? <span className="ml-2 text-xs text-gray-400">{a.district}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
