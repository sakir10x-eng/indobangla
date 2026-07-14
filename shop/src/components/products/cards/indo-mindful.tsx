import Link from '@/components/ui/link';
import { Image } from '@/components/ui/image';
import cn from 'classnames';
import dynamic from 'next/dynamic';
import { Routes } from '@/config/routes';
import { Product } from '@/types';
import { productPlaceholder } from '@/lib/placeholders';
import usePrice from '@/lib/use-price';
import { ExternalIcon } from '@/components/icons/external-icon';

const AddToCart = dynamic(
  () =>
    import('@/components/products/add-to-cart/add-to-cart').then(
      (module) => module.AddToCart,
    ),
  { ssr: false },
);

/**
 * IndoBangla "Mindful Reads" home product card (uploaded design): flag ribbon,
 * discount chip, rating, a short hook line, price + savings, urgency stock bar,
 * and a red CTA. Fully data-driven; falls back gracefully when a field is
 * missing. Admins can switch back to the classic card from Settings → Image Sizes.
 */

// Copy stays Bengali, but every number is written in English digits — the prices
// elsewhere on the page are English, and mixing the two reads as a bug.
const bn = (n: number | string) => String(n);

const stripHtml = (s?: string) =>
  (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
  </svg>
);

type Props = { product: Product; className?: string };

const IndoMindful: React.FC<Props> = ({ product, className }) => {
  const {
    name,
    slug,
    image,
    author,
    quantity,
    ratings,
    total_reviews,
    product_type,
    is_external,
    external_product_url,
  } = (product ?? {}) as any;

  const { price, basePrice, discount } = usePrice({
    amount: product.sale_price ? product.sale_price : product.price!,
    baseAmount: product.price,
  });

  const isVariable = String(product_type ?? '').toLowerCase() === 'variable';
  const saveAmount =
    product.price && product.sale_price && product.price > product.sale_price
      ? Math.round(product.price - product.sale_price)
      : 0;

  // flag ribbon
  const sold = Number((product as any).sold_quantity ?? 0);
  const lowStock = typeof quantity === 'number' && quantity > 0 && quantity <= 10;
  const flag =
    sold >= 50
      ? { label: 'বেস্ট সেলার', hot: true }
      : lowStock
        ? { label: 'দ্রুত শেষ হচ্ছে', hot: false }
        : { label: 'স্টাফ পিক', hot: false };

  // urgency bar — fuller when stock is lower
  const stockFill =
    typeof quantity !== 'number' || quantity <= 0
      ? 100
      : Math.min(100, Math.max(28, 100 - quantity * 3.2));

  const rating = Number(ratings ?? 0);
  const reviews = Number(total_reviews ?? 0);
  const hook = stripHtml((product as any).description).slice(0, 95);

  return (
    <article
      className={cn(
        'ib-mindful group relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[#ECEBE8] bg-white shadow-[0_1px_2px_rgba(28,28,30,.04),0_10px_30px_rgba(28,28,30,.05)] transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_4px_10px_rgba(28,28,30,.05),0_22px_48px_rgba(28,28,30,.11)]',
        className,
      )}
    >
      {/* flag */}
      <span
        className={cn(
          'absolute left-3 top-0 z-[3] max-w-[70%] truncate rounded-b-[7px] px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-white sm:px-2.5 sm:py-1.5 sm:text-[10px]',
          flag.hot ? 'bg-[#E63946]' : 'bg-[#1C1C1E]',
        )}
      >
        {flag.label}
      </span>

      {/* media */}
      <Link
        href={Routes.product(slug)}
        className="relative flex justify-center bg-[#F4F3F0] px-4 pb-4 pt-6 sm:px-5 sm:pb-5 sm:pt-7"
      >
        {discount && !isVariable && (
          <span className="absolute right-2.5 top-2.5 z-[3] rounded-lg bg-[#E63946] px-2 py-1 text-[11px] font-extrabold leading-none text-white shadow-[0_5px_14px_rgba(230,57,70,.32)] sm:right-4 sm:top-4 sm:px-2.5 sm:py-1.5 sm:text-[12.5px]">
            -{discount}
          </span>
        )}
        <div className="relative aspect-[2/3] w-full max-w-[140px] overflow-hidden rounded-md shadow-[0_12px_26px_rgba(28,28,30,.16),0_2px_5px_rgba(28,28,30,.1)] sm:max-w-[152px]">
          <Image
            src={image?.original ?? productPlaceholder}
            alt={name}
            fill
            quality={90}
            sizes="(max-width:640px) 40vw, (max-width:1024px) 22vw, 180px"
            className="object-cover"
          />
        </div>
      </Link>

      {/* body */}
      <div className="flex flex-1 flex-col px-3.5 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-[18px]">
        {/* rating */}
        <div className="mb-2 flex items-center gap-[7px]">
          <span className="flex gap-0.5 text-[#E63946]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={i < Math.round(rating || 5) ? '' : 'text-[#E7DADB]'}>
                <Star />
              </span>
            ))}
          </span>
          <small className="text-[12px] font-semibold text-[#6B6B70]">
            {bn((rating || 5).toFixed(1))}
            {reviews > 0 ? ` · ${bn(reviews)} রিভিউ` : ''}
          </small>
        </div>

        <Link
          href={Routes.product(slug)}
          title={name}
          className="line-clamp-2 min-h-[2.4rem] break-words text-[13.5px] font-semibold leading-[1.3] tracking-[-.01em] text-[#1C1C1E] transition-colors hover:text-[#E63946] sm:text-[15px]"
        >
          {name}
        </Link>
        {author && (
          <Link
            href={Routes.author(author?.slug!)}
            className="mb-2.5 mt-1 line-clamp-1 text-[11.5px] text-[#9A9AA0] transition-colors hover:text-[#E63946] sm:mb-3 sm:text-[12.5px]"
          >
            {author?.name}
          </Link>
        )}

        {hook && (
          <div className="mb-3 hidden items-start gap-2 rounded-[9px] border border-[rgba(30,158,90,.18)] bg-[rgba(30,158,90,.07)] px-2.5 py-2 text-[11.5px] font-medium leading-[1.4] text-[#6B6B70] sm:flex sm:px-3 sm:py-2.5 sm:text-[12.6px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1E9E5A]">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="line-clamp-2">{hook}</span>
          </div>
        )}

        {/* price */}
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[20px] font-extrabold tracking-[-.02em] text-[#1C1C1E] sm:text-[24px]">{price}</span>
          {basePrice && (
            <span className="text-[12px] font-medium text-[#9A9AA0] line-through sm:text-[13.5px]">{basePrice}</span>
          )}
        </div>
        {saveAmount > 0 && (
          <div className="mb-3 text-[11.5px] font-bold text-[#C42D39] sm:text-[12px]">
            সাশ্রয় ৳{bn(saveAmount)}
          </div>
        )}

        {/* stock urgency */}
        {typeof quantity === 'number' && quantity > 0 && quantity <= 40 && (
          <div className="mb-3.5">
            <div className="h-[5px] overflow-hidden rounded-full bg-[#ECEBE8]">
              <div className="h-full rounded-full bg-[#E63946]" style={{ width: `${stockFill}%` }} />
            </div>
            <small className="mt-1.5 block text-[11.5px] font-semibold text-[#6B6B70]">
              স্টকে {quantity <= 10 ? 'মাত্র ' : ''}
              <b className="text-[#C42D39]">{bn(quantity)} কপি</b> বাকি
            </small>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          {is_external ? (
            <Link
              href={external_product_url}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E63946] py-3.5 text-[14.5px] font-semibold text-white shadow-[0_5px_14px_rgba(230,57,70,.26)] transition hover:bg-[#C42D39]"
            >
              <ExternalIcon className="h-4 w-4 stroke-2" /> কিনুন
            </Link>
          ) : (
            <div className="ib-mindful-cart">
              <AddToCart data={product} variant="neon" />
            </div>
          )}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#9A9AA0]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3 w-3 text-[#1E9E5A]">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            পছন্দ না হলে ৭ দিনে ফেরত
          </div>
        </div>
      </div>
    </article>
  );
};

export default IndoMindful;
