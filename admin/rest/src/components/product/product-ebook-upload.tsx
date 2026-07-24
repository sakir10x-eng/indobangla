import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import { HttpClient } from '@/data/client/http-client';
import { useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';

/**
 * Attach a sellable e-book to this product.
 *
 * The file is stored on the server's PRIVATE disk and converted to page images — customers read
 * it in the browser one watermarked page at a time and can never download or forward it. Only
 * available while editing a saved product, because the file is keyed to the product id.
 */
export default function ProductEbookUpload({ productId }: { productId?: number | string }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, refetch, isLoading } = useQuery(
    ['ebook-status', productId],
    () => HttpClient.get<any>(`ebooks/${productId}/status`),
    { enabled: Boolean(productId), retry: false },
  );

  const asset = (data as any)?.ebook;
  const tools = (data as any)?.tools ?? {};

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('একটি PDF বা EPUB ফাইল বেছে নিন।');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const res: any = await HttpClient.post(`ebooks/${productId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.status === 'success') {
        toast.success(res?.message ?? 'ই-বুক প্রস্তুত।');
      } else {
        toast.error(res?.message ?? 'ই-বুক প্রস্তুত করা যায়নি।');
      }
      if (fileRef.current) fileRef.current.value = '';
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('এই প্রোডাক্ট থেকে ই-বুকটি মুছে ফেলবেন?')) return;
    setBusy(true);
    try {
      await HttpClient.delete(`ebooks/${productId}`);
      toast.success('ই-বুক মুছে ফেলা হয়েছে।');
      refetch();
    } catch {
      toast.error('মুছে ফেলা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap pb-8 my-5 border-b border-dashed border-border-base sm:my-8">
      <Description
        title="ই-বুক (পড়ার জন্য)"
        details="PDF বা EPUB আপলোড করলে এই বইটি ই-বুক হিসেবে বিক্রি হবে। ক্রেতা শুধু ওয়েবসাইটেই পড়তে পারবে — ডাউনলোড বা শেয়ার করা যাবে না। ই-বুক থাকা অর্ডার শুধু বিকাশে পরিশোধ করা যায়।"
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        {!productId ? (
          <p className="text-sm text-gray-500">
            প্রোডাক্টটি একবার সেভ করার পর এখানে ই-বুক আপলোড করা যাবে।
          </p>
        ) : (
          <>
            {isLoading ? (
              <p className="text-sm text-gray-500">অবস্থা দেখা হচ্ছে…</p>
            ) : asset ? (
              <div className="mb-4 rounded-lg border border-border-base p-3 text-sm">
                <div className="font-semibold text-heading">
                  {asset.file_name ?? 'ই-বুক'}{' '}
                  <span className="text-xs font-normal uppercase text-gray-500">
                    ({asset.format})
                  </span>
                </div>
                {asset.state === 'ready' ? (
                  <p className="mt-1 text-emerald-600">
                    ✓ প্রস্তুত — {asset.page_count} পৃষ্ঠা
                  </p>
                ) : (
                  <p className="mt-1 text-rose-600">
                    ⚠ {asset.state}: {asset.error ?? 'রূপান্তর সম্পন্ন হয়নি'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="mt-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                >
                  ই-বুক মুছুন
                </button>
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-500">এখনো কোনো ই-বুক যুক্ত করা হয়নি।</p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              className="block w-full text-sm"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={upload}
                disabled={busy}
                className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'প্রসেস হচ্ছে…' : 'আপলোড ও প্রস্তুত করুন'}
              </button>
              <span className="text-xs text-gray-500">
                বড় বইয়ে কয়েক মিনিট লাগতে পারে (প্রতিটি পৃষ্ঠা ছবিতে রূপান্তর হয়)।
              </span>
            </div>

            {tools?.epub === false && (
              <p className="mt-3 text-xs text-amber-600">
                সার্ভারে EPUB রূপান্তরের টুল (calibre) নেই — আপাতত PDF আপলোড করুন।
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
