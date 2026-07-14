import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useExtractProductMutation, useFetchImageMutation } from '@/data/ai';

function pickError(err: any, body: any): string {
  return (
    body?.errors?.[0]?.message ||
    body?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.message ||
    'AI request failed. Check Settings → AI.'
  );
}

export default function AiAutofill() {
  const { setValue } = useFormContext();
  const { mutate: extract, isLoading } = useExtractProductMutation();
  const { mutate: fetchImage, isLoading: fetchingImage } =
    useFetchImageMutation();

  function importCover(url?: string) {
    const src = url || imageUrl || found?.image_url;
    if (!src) {
      toast.error('No cover image URL to fetch.');
      return;
    }
    fetchImage(src, {
      onSuccess: (res: any) => {
        if (res?.image?.original) {
          setValue('image', res.image, { shouldDirty: true });
          toast.success('Cover image imported.');
        } else {
          toast.error(pickError(null, res));
        }
      },
      onError: (err: any) => toast.error(pickError(err, err?.response?.data)),
    });
  }

  const [imageUrl, setImageUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [text, setText] = useState('');
  const [found, setFound] = useState<any | null>(null);

  const set = (name: string, value: any) => {
    if (value !== undefined && value !== null && value !== '') {
      setValue(name, value, { shouldDirty: true });
    }
  };

  function handleFetch() {
    if (!imageUrl && !productUrl && !text) {
      toast.error('Enter an image URL, a product URL, or some text first.');
      return;
    }
    extract(
      { image_url: imageUrl, product_url: productUrl, text },
      {
        onSuccess: (res: any) => {
          const p = res?.product;
          if (!p || res?.errors) {
            toast.error(pickError(null, res));
            return;
          }
          // Auto-fill the scalar fields that exist on the form
          set('name', p.name);
          set('description', p.description);
          set('price', p.price);
          set('sale_price', p.sale_price);
          set('quantity', p.quantity ?? 1);
          set('sku', p.sku);
          set('unit', p.unit || '1 pc');
          // group / taxonomy / slug / status (auto-detected + created on the server)
          if (p.type) setValue('type', p.type, { shouldDirty: true });
          if (Array.isArray(p.categories) && p.categories.length)
            setValue('categories', p.categories, { shouldDirty: true });
          if (p.author) setValue('author', p.author, { shouldDirty: true });
          if (p.manufacturer)
            setValue('manufacturer', p.manufacturer, { shouldDirty: true });
          set('slug', p.slug);
          setValue('status', p.status || 'publish', { shouldDirty: true });
          // book specification fields
          set('book.isbn10', p.isbn10);
          set('book.isbn13', p.isbn13);
          set('book.language', p.language);
          set('book.print_type', p.print_type);
          set('book.printed_country', p.printed_country);
          set('book.condition', p.condition);
          set('book.reading_level', p.reading_level);
          set('book.edition', p.edition);
          set('book.item_weight', p.item_weight);
          set('book.page_number', p.page_number);
          set('book.height', p.height);
          set('book.width', p.width);
          set('book.length', p.length);
          setFound(p);
          // auto-import the cover image into our storage + set it
          if (p.image_url) importCover(p.image_url);
          toast.success('AI filled the product fields. Review before saving.');
        },
        onError: (err: any) => {
          toast.error(pickError(err, err?.response?.data));
        },
      }
    );
  }

  const list = (arr?: string[]) =>
    Array.isArray(arr) && arr.length ? arr.join(', ') : '—';

  return (
    <div className="flex flex-wrap pb-8 border-b border-dashed border-border-base my-5 sm:my-8">
      <Description
        title="✨ AI Auto-fill"
        details="Paste a book cover image URL, a product page URL, or some text. The AI reads it and fills the fields below. Requires an API key in Settings → AI."
        className="w-full px-0 sm:pe-4 md:pe-5 sm:w-4/12 md:w-1/3"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        <Input
          label="Cover image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…/book-cover.jpg"
          className="mb-4"
        />
        <Input
          label="Product page URL"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder="https://…/product/the-art-of-war"
          className="mb-4"
        />
        <div className="mb-4">
          <label className="block text-body-dark font-semibold text-sm leading-none mb-3">
            Or paste any text / notes
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full rounded border border-border-base bg-white px-4 py-3 text-sm text-heading focus:border-accent focus:outline-none"
            placeholder="The Art of War by Sun Tzu, hardcover, English, ISBN 978-…"
          />
        </div>

        <Button type="button" onClick={handleFetch} loading={isLoading} disabled={isLoading}>
          {isLoading ? 'Reading with AI…' : 'Fetch with AI'}
        </Button>

        {found && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-heading mb-2">
              AI also found (apply these manually where needed):
            </p>
            <ul className="space-y-1 text-body">
              <li><b>Authors:</b> {list(found.authors)}</li>
              <li><b>Publisher:</b> {found.publisher || '—'}</li>
              <li><b>Categories:</b> {list(found.categories)}</li>
              <li><b>Tags:</b> {list(found.tags)}</li>
              <li><b>ISBN-10 / 13:</b> {found.isbn10 || '—'} / {found.isbn13 || '—'}</li>
              <li><b>Language:</b> {found.language || '—'} &nbsp; <b>Pages:</b> {found.page_number || '—'} &nbsp; <b>Print:</b> {found.print_type || '—'}</li>
              {found.image_url && (
                <li className="pt-2">
                  <b>Cover:</b>{' '}
                  <a href={found.image_url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                    {found.image_url}
                  </a>
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={found.image_url} alt="cover" className="h-24 w-auto rounded border" />
                    <button
                      type="button"
                      onClick={() => importCover(found.image_url)}
                      disabled={fetchingImage}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                    >
                      {fetchingImage ? 'Importing…' : 'Import as cover'}
                    </button>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
