import { useState } from 'react';
import { useMutation } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import { toast } from 'react-toastify';
import { useUser } from '@/framework/user';

/** Must match the reasons the API accepts — anything else is rejected server-side. */
const REASONS: [string, string][] = [
  ['price', 'দাম ভুল'],
  ['cover', 'কভার/ছবি ভুল'],
  ['author', 'লেখক/প্রকাশনী ভুল'],
  ['description', 'বর্ণনা ভুল'],
  ['other', 'অন্য কিছু'],
];

/**
 * Product page → report wrong information about this book. The API keeps one open report per
 * customer per book, so re-submitting while a report is still open is refused there too.
 */
export default function ReportInfo({ productId }: { productId: number }) {
  const { isAuthorized } = useUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('price');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);

  const { mutate, isLoading } = useMutation(
    (input: any) => HttpClient.post<any>('product-report', input),
    {
      onSuccess: (r: any) => {
        toast.success(r?.message || 'ধন্যবাদ! রিপোর্ট জমা হয়েছে।');
        setDone(true);
        setOpen(false);
        setDetails('');
      },
      onError: (e: any) =>
        toast.error(e?.response?.data?.message || 'রিপোর্ট জমা দেওয়া যায়নি।'),
    },
  );

  if (done) {
    return (
      <p className="mt-3 text-xs font-medium text-[#1f7a52]">
        ✅ রিপোর্টের জন্য ধন্যবাদ — আমরা তথ্যটি যাচাই করে ঠিক করে নেব।
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-accent"
      >
        ⚠️ এই বইয়ের তথ্যে ভুল আছে? রিপোর্ট করুন
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold text-heading">কী ভুল আছে?</p>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {REASONS.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setReason(val)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              reason === val
                ? 'bg-accent text-white'
                : 'bg-white text-body ring-1 ring-border-200 hover:bg-accent/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="একটু বিস্তারিত লিখুন (ঐচ্ছিক)"
        className="w-full rounded-lg border border-border-200 p-2 text-xs outline-none focus:border-accent"
      />

      {!isAuthorized && (
        <p className="mt-1.5 text-[11px] text-muted">রিপোর্ট করতে লগইন করতে হবে।</p>
      )}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isLoading || !isAuthorized}
          onClick={() => mutate({ product_id: productId, reason, details })}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? 'পাঠানো হচ্ছে…' : 'রিপোর্ট পাঠান'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-body hover:bg-gray-100"
        >
          বাতিল
        </button>
      </div>
    </div>
  );
}
