import { useState } from 'react';
import Uploader from '@/components/ui/forms/uploader';
import { useCreatePost, useBookSearch } from '@/framework/community';

const imgUrl = (image: any): string | null => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  return image.original || image.thumbnail || null;
};

export default function PostComposer() {
  const { createPost, isCreating } = useCreatePost();
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [book, setBook] = useState<any>(null);
  const [q, setQ] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { results, searching } = useBookSearch(q);

  const canPost = (body.trim() || photos.length > 0) && !isCreating;

  const submit = () => {
    if (!canPost) return;
    createPost(
      {
        body: body.trim() || undefined,
        photos: photos.map((p) => ({
          original: p.original,
          thumbnail: p.thumbnail,
        })),
        product_id: book?.id ?? null,
      },
      {
        onSuccess: (res: any) => {
          if (res?.status !== 'fail') {
            setBody('');
            setPhotos([]);
            setBook(null);
            setQ('');
            setPickerOpen(false);
          }
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-xl border border-border-200 bg-light p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="আপনার পড়া বই নিয়ে কিছু লিখুন…"
        className="w-full resize-none rounded-lg border border-border-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />

      {/* Book tag */}
      <div className="mt-2">
        {book ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 py-1 pl-2 pr-1 text-[12px] text-accent">
            📖 {book.name}
            <button
              onClick={() => setBook(null)}
              className="rounded-full bg-accent/20 px-1.5 text-[10px]"
            >
              ✕
            </button>
          </span>
        ) : pickerOpen ? (
          <div className="relative">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="বই খুঁজুন…"
              className="h-9 w-full rounded-lg border border-border-200 px-3 text-sm focus:border-accent focus:outline-none"
            />
            {q.trim().length > 1 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-200 bg-light shadow-lg">
                {searching ? (
                  <p className="px-3 py-2 text-xs text-body">খোঁজা হচ্ছে…</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-body">পাওয়া যায়নি।</p>
                ) : (
                  results.map((b: any) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBook(b);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {imgUrl(b.image) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl(b.image) as string}
                          alt=""
                          className="h-8 w-6 rounded object-cover"
                        />
                      )}
                      <span className="flex-1">{b.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[13px] font-medium text-accent hover:underline"
          >
            📖 বই ট্যাগ করুন
          </button>
        )}
      </div>

      {/* Photos */}
      <div className="mt-3">
        <Uploader multiple onChange={setPhotos} value={photos} />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={!canPost}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-light disabled:opacity-50"
        >
          {isCreating ? 'পোস্ট হচ্ছে…' : 'পোস্ট করুন'}
        </button>
      </div>
    </div>
  );
}
