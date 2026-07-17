import SelectInput from '@/components/ui/select-input';
import Label from '@/components/ui/label';
import Input from '@/components/ui/input';
import { Control, useWatch } from 'react-hook-form';
import { useProductsQuery } from '@/data/product';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface Props {
  control: Control<any>;
  register: any;
}

/**
 * Feature 2 — Gift with product.
 * Admin picks a pool of products the buyer may choose a free gift from, and how
 * many gifts the buyer may pick (gift_max = 0 turns the feature off).
 *
 * The picker searches the whole catalogue server-side (same broadened `text`
 * OR-search the storefront header uses — matches Bangla/English name, author and
 * the romanised slug, so banglish like "anandamela" works too). Selected options
 * are product objects here; form-utils maps them to ids on submit.
 */
const ProductGiftInput = ({ control, register }: Props) => {
  const { locale } = useRouter();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { products, loading } = useProductsQuery({
    name: debounced || undefined,
    limit: 30,
    language: locale,
  } as any);

  const giftMax = useWatch({ control, name: 'gift_max' });
  const giftPerCopy = useWatch({ control, name: 'gift_per_copy' });

  return (
    <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
      <label className="text-sm font-semibold text-slate-700">🎁 উপহার (Gift with product)</label>
      <p className="mt-1 text-[11px] text-slate-500">
        এই বই কিনলে কাস্টমার নিচের তালিকা থেকে ফ্রি উপহার বেছে নিতে পারবে।
        স্টক-আউট থাকলে অটো বাদ যাবে। <b>উপহার সংখ্যা ০</b> দিলে ফিচারটি বন্ধ।
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label>উপহারের তালিকা (নাম লিখে খুঁজুন — বাংলা / English / banglish)</Label>
          <SelectInput
            name="gift_product_ids"
            isMulti
            control={control}
            getOptionLabel={(o: any) => o.name}
            getOptionValue={(o: any) => o.id}
            // @ts-ignore
            options={products}
            isLoading={loading}
            // Server does the matching → don't let react-select re-filter results.
            onInputChange={(val: string) => setTerm(val)}
            filterOption={() => true}
            placeholder="নাম / লেখক / slug লিখে খুঁজুন…"
            // Show the book cover next to the name in options & selected chips.
            formatOptionLabel={(o: any) => (
              <div className="flex items-center gap-2">
                {(o?.image?.thumbnail || o?.image?.original) && (
                  <img
                    src={o.image.thumbnail || o.image.original}
                    alt=""
                    className="h-8 w-6 flex-shrink-0 rounded object-cover"
                  />
                )}
                <span className="truncate text-sm">{o.name}</span>
              </div>
            )}
          />
        </div>
        <Input
          label="কতটি বাছতে পারবে (0 = বন্ধ)"
          {...register('gift_max')}
          type="number"
          variant="outline"
          placeholder="0"
        />
      </div>
      {Number(giftMax) > 0 && (
        <>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" {...register('gift_per_copy')} />
            প্রতি কপিতে উপহার (আনচেক করলে পুরো অর্ডারে {Number(giftMax)}টি — যত কপিই নিক)
          </label>
          <p className="mt-1 text-[11px] font-semibold text-amber-700">
            {giftPerCopy
              ? `প্রতি ১ কপিতে ${Number(giftMax)}টি — ২ কপি নিলে ${Number(giftMax) * 2}টি উপহার।`
              : `পুরো অর্ডারে মোট ${Number(giftMax)}টি উপহার (কপি সংখ্যা যাই হোক)।`}
          </p>
        </>
      )}
    </div>
  );
};

export default ProductGiftInput;
