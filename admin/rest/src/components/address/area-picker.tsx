import { useState } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';

/**
 * Delivery area, autocompleted from RedX's own area list (same source the shop uses).
 * The admin types, we suggest, they pick — so the area stored on the order is one the
 * courier definitely recognises and a shipment can never fail on an area mismatch.
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
  // `custom` = the admin typed an area that is not in the courier's list.
  const [custom, setCustom] = useState(false);

  const q = term.trim();
  const { data, isFetching } = useQuery(
    ['courier-areas', q],
    () => HttpClient.get<any>('courier-areas', { q }),
    { enabled: q.length > 1 && !picked, keepPreviousData: true }
  );
  const areas: any[] = (data as any)?.data ?? [];

  const useAsOtherArea = () => {
    if (!q) return;
    onChange(q);
    setPicked(true);
    setCustom(true);
    setOpen(false);
  };

  const box: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 40,
    background: '#fff',
    border: '1px solid #d2ccc5',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(51,49,50,.12)',
    maxHeight: 220,
    overflowY: 'auto',
  };
  const row: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid #e5e1dc',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <div style={{ position: 'relative' }}>
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
        placeholder="এলাকার নাম লিখুন — যেমন Dhanmondi, Mirpur…"
        autoComplete="off"
      />

      {picked ? (
        custom ? (
          <p style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#8a5a0b' }}>
            ✓ অন্য এলাকা হিসেবে যোগ — কুরিয়ার ম্যানুয়ালি মিলিয়ে নেবে।
          </p>
        ) : (
          <p style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#1d7a5f' }}>
            ✓ কুরিয়ারের তালিকা থেকে বেছে নেওয়া হয়েছে
          </p>
        )
      ) : (
        <p style={{ marginTop: 4, fontSize: 11, color: '#9a9799' }}>
          লিখলে সাজেশন আসবে — <b>তালিকা থেকে বেছে নিন</b>।
        </p>
      )}

      {open && !picked && q.length > 1 && (
        <div style={box}>
          {isFetching && areas.length === 0 && (
            <div style={{ ...row, cursor: 'default', color: '#9a9799' }}>
              খোঁজা হচ্ছে…
            </div>
          )}
          {!isFetching && areas.length === 0 && (
            <div style={{ ...row, cursor: 'default', color: '#9a9799' }}>
              এই নামে কুরিয়ার তালিকায় এরিয়া নেই।
            </div>
          )}
          {areas.map((a: any, i: number) => (
            <button
              type="button"
              key={`${a.id}-${i}`}
              style={row}
              onClick={() => {
                setTerm(a.name);
                onChange(a.name);
                setPicked(true);
                setCustom(false);
                setOpen(false);
              }}
            >
              <span style={{ fontWeight: 500, color: '#333132' }}>{a.name}</span>
              {a.district ? (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#9a9799' }}>
                  {a.district}
                </span>
              ) : null}
            </button>
          ))}

          {/* Area not in the courier list? Keep what was typed. */}
          {!isFetching && (
            <button
              type="button"
              onClick={useAsOtherArea}
              style={{
                ...row,
                borderTop: '1px solid #e5e1dc',
                borderBottom: 'none',
                background: '#fdf3e3',
              }}
            >
              <span style={{ fontWeight: 600, color: '#8a5a0b' }}>“{q}”</span>
              <span style={{ color: '#8a5a0b' }}>
                {' '}
                — অন্য এলাকা হিসেবে ব্যবহার করুন (তালিকায় নেই)
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
