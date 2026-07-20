import { useState } from "react";

// Post-purchase repeat-order nudge shown on the thank-you page: a real, working coupon
// (NEXT50 = ৳50 off orders over ৳499). Copying it seeds the next visit; sharing spreads it.
const CODE = "NEXT50";

const NextOrderCoupon: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
    } catch {
      window.prompt("কোডটি কপি করুন:", CODE);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    const text = `IndoBangla থেকে বই কিনুন — কোড ${CODE} দিয়ে ৳৫০ ছাড় (৳৪৯৯+ অর্ডারে)। https://indobangla.bd`;
    // @ts-ignore
    if (navigator?.share) {
      // @ts-ignore
      try { await navigator.share({ text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); alert("শেয়ার লেখা কপি হয়েছে"); }
    catch { window.prompt("শেয়ার করুন:", text); }
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl rounded-2xl border border-dashed border-[#e63946] bg-[#fff5f5] p-5 text-center">
      <div className="text-lg font-bold text-[#333132]">🎁 পরের অর্ডারে ৳৫০ ছাড়!</div>
      <p className="mt-1 text-sm text-gray-600">ধন্যবাদ কেনাকাটার জন্য। এই কোডটি রাখুন — ৳৪৯৯+ অর্ডারে ব্যবহার করুন।</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="rounded-lg border-2 border-dashed border-[#e63946] bg-white px-4 py-2 font-mono text-lg font-bold tracking-widest text-[#e63946]">
          {CODE}
        </span>
        <button onClick={copy} className="rounded-lg bg-[#e63946] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          {copied ? "✓ কপি হয়েছে" : "কপি করুন"}
        </button>
      </div>
      <button onClick={share} className="mt-3 text-sm font-medium text-[#e63946] underline-offset-2 hover:underline">
        বন্ধুকে শেয়ার করুন →
      </button>
    </div>
  );
};

export default NextOrderCoupon;
