import Label from '@/components/ui/label';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Admin-editable search keywords, stored as the "search_keywords" product meta and matched by the
 * storefront search. Auto-suggested from the product's own details (name, Bangla name, author,
 * publisher, categories, tags, edition, ISBN) so a book also surfaces for the words shoppers
 * actually type — the admin can then add to or rewrite the list freely.
 */
export default function ProductSearchKeywords() {
  const { register, getValues, setValue, watch } = useFormContext();
  const name = watch('name');

  const build = () => {
    const v: any = getValues();
    const parts: any[] = [
      v?.name,
      v?.bangla_name,
      v?.author?.name,
      v?.manufacturer?.name,
      ...(Array.isArray(v?.categories) ? v.categories.map((c: any) => c?.name) : []),
      ...(Array.isArray(v?.tags) ? v.tags.map((t: any) => t?.name) : []),
      v?.book?.edition,
      v?.book?.print_type,
      v?.book?.language,
      v?.book?.isbn10,
      v?.book?.isbn13,
    ];
    const seen = new Set<string>();
    const words = parts
      .filter(Boolean)
      .map((s: any) => String(s).trim())
      .filter((s: string) => s.length > 1)
      .filter((s: string) => {
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    setValue('search_keywords', words.join(', '), { shouldDirty: true });
  };

  // Fill in automatically the first time the product has a name and no keywords yet (covers both
  // a fresh entry and an AI auto-fill). Never overwrites something the admin has already written.
  useEffect(() => {
    if (name && !getValues('search_keywords')) build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <div className="mt-5">
      <Label>সার্চ কিওয়ার্ড</Label>
      <textarea
        {...register('search_keywords')}
        rows={3}
        placeholder="কমা দিয়ে আলাদা করুন — যেমন: হুমায়ূন আহমেদ, হিমু, উপন্যাস, humayun ahmed"
        className="mt-1 w-full rounded border border-border-base px-4 py-3 text-sm focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-xs text-gray-500">
          এই শব্দগুলো দিয়ে সার্চ করলেও বইটি খুঁজে পাওয়া যাবে। প্রোডাক্টের তথ্য থেকে স্বয়ংক্রিয়ভাবে
          তৈরি হয় — ইচ্ছেমতো যোগ বা সম্পাদনা করতে পারেন।
        </p>
        <button
          type="button"
          onClick={build}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          স্বয়ংক্রিয় তৈরি করুন
        </button>
      </div>
    </div>
  );
}
