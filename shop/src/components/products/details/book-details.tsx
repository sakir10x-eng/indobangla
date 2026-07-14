import usePrice from '@/lib/use-price';
import { ThumbsCarousel } from '@/components/ui/thumb-carousel';
import { useTranslation } from 'next-i18next';
import { getVariations } from '@/lib/get-variations';
import { useEffect, useMemo, useRef, useState } from 'react';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import Truncate from '@/components/ui/truncate';
import { scroller, Element } from 'react-scroll';
import VariationPrice from './variation-price';
import { Routes } from '@/config/routes';
import type { Product } from '@/types';
import { useAtom } from 'jotai';
import VariationGroups from './variation-groups';
import { isVariationSelected } from '@/lib/is-variation-selected';
import { stickyShortDetailsAtom } from '@/store/sticky-short-details-atom';
import { useAttributes } from './attributes.context';
import { AddToCartAlt } from '@/components/products/add-to-cart/add-to-cart-alt';
import BadgeGroups from './badge-groups';
import Link from '@/components/ui/link';
import { displayImage } from '@/lib/display-product-preview-images';
import { useImageSizes } from '@/lib/use-image-sizes';
import { useFeaturedBooks } from '@/lib/use-featured-books';
import { recordView } from '@/lib/browsing-history';
import { useCart } from '@/store/quick-cart/cart.context';
import { generateCartItem } from '@/store/quick-cart/generate-cart-item';
import { useChallengeGate } from '@/lib/use-challenge-gate';
import { toast } from 'react-toastify';
import { useUser } from '@/framework/user';
import dayjs from 'dayjs';
import { useIntersection } from 'react-use';
import dynamic from 'next/dynamic';
import { AddToCartExternal } from '@/components/products/add-to-cart/add-to-cart-external';
import { useSanitizeContent } from '@/lib/sanitize-content';
import { useQuery } from 'react-query';
import { HttpClient } from '@/framework/client/http-client';
import { useSettings } from '@/framework/settings';
import RestockRequest from '@/components/products/details/restock-request';

const FavoriteButton = dynamic(
  () => import('@/components/products/details/favorite-button'),
  { ssr: false },
);

const bdt = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/** HH:MM:SS remaining until midnight — the "deal of the day" resets daily. */
function useMidnightCountdown() {
  const [t, setT] = useState('00:00:00');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      let s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setT(`${h}:${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Hours/minutes left until the 6 PM next-day-delivery cut-off. */
function useDeliveryCutoff() {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(18, 0, 0, 0);
      if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
      const mins = Math.max(0, Math.floor((cutoff.getTime() - now.getTime()) / 60000));
      setTxt(`${Math.floor(mins / 60)} hr ${mins % 60} min`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return txt;
}

/** Gently fluctuating "people viewing" number (client-only social proof). */
function useViewers(seed: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const base = 8 + (seed % 10);
    setN(base);
    const id = setInterval(() => setN(base + Math.floor(Math.random() * 8)), 7000);
    return () => clearInterval(id);
  }, [seed]);
  return n;
}

type Props = {
  product: Product;
  backBtn?: boolean;
  isModal?: boolean;
};

const BookDetails: React.FC<Props> = ({ product, isModal = false }) => {
  const { single_max, fbt_h } = useImageSizes();
  const { fbt: fbtOverride } = useFeaturedBooks(product?.id);
  const {
    id,
    name,
    image,
    description,
    categories,
    gallery,
    type,
    sku,
    author,
    manufacturer,
    tags,
    video,
    is_digital,
    is_external,
    external_product_url,
    book,
    quantity,
  } = product ?? {};

  const { t } = useTranslation('common');
  const { settings } = useSettings();
  const [_, setShowStickyShortDetails] = useAtom(stickyShortDetailsAtom);

  // Record this book in the browsing history for personalized home rails.
  useEffect(() => {
    if (!product?.slug) return;
    recordView({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image?.original,
      category: product.categories?.[0]?.slug,
      price: product.price,
      sale_price: product.sale_price,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug]);

  const { attributes } = useAttributes();
  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });
  useEffect(() => {
    if (intersection && intersection.isIntersecting) {
      setShowStickyShortDetails(false);
      return;
    }
    if (intersection && !intersection.isIntersecting) {
      setShowStickyShortDetails(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intersection]);

  const { price, basePrice, discount } = usePrice({
    amount: product?.sale_price ? product?.sale_price : product?.price,
    baseAmount: product?.price ?? 0,
  });

  const variations = useMemo(
    () => getVariations(product?.variations),
    [product?.variations],
  );
  const isSelected = isVariationSelected(variations, attributes);
  let selectedVariation: any = {};
  if (isSelected) {
    selectedVariation = product?.variation_options?.find((o: any) =>
      isEqual(
        o.options.map((v: any) => v.value).sort(),
        Object.values(attributes).sort(),
      ),
    );
  }
  const hasVariations = !isEmpty(variations);
  // Item 5: the main gallery shows ONLY the cover; the gallery images are
  // shown separately as an "inside the book" preview strip.
  const coverImages = displayImage(selectedVariation?.image, [], image);
  const insideImages = Array.isArray(gallery)
    ? gallery.filter((g: any) => g && (g.original || g.thumbnail))
    : [];
  const content = useSanitizeContent({ description });

  // ----- pricing maths for the conversion block -----
  const rawPrice = Number(product?.price ?? product?.max_price ?? 0);
  const rawSale = Number(product?.sale_price ?? 0);
  const hasSaving = rawSale > 0 && rawPrice > 0 && rawSale < rawPrice;
  const saveAmt = hasSaving ? Math.round(rawPrice - rawSale) : 0;
  const savePct = hasSaving ? Math.round((1 - rawSale / rawPrice) * 100) : 0;
  const payNow = hasSaving ? rawSale : rawPrice;
  const qty = Number(quantity ?? 0);

  // ----- real ratings (only shown when the product actually has reviews) -----
  const ratings = Number((product as any)?.ratings ?? 0);
  const totalReviews = Number((product as any)?.total_reviews ?? 0);
  const ratingCount: any[] = (product as any)?.rating_count ?? [];
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const row = ratingCount.find((r: any) => Number(r.rating) === star);
    const total = Number(row?.total ?? 0);
    return { star, total, pct: totalReviews ? Math.round((total / totalReviews) * 100) : 0 };
  });

  // ----- frequently bought together: same author first, then same category -----
  const { data: relRes } = useQuery(
    ['related-books', id, 'fbt'],
    () => HttpClient.get<any>('related-books', { product_id: id }),
    { enabled: !!id },
  );
  // Auto FBT (algorithmic). When the admin has curated a specific FBT list (#2),
  // use those books instead — excluding the current product.
  const autoFbt = [
    ...(((relRes as any)?.by_author ?? []) as any[]),
    ...(((relRes as any)?.by_category ?? []) as any[]),
  ]
    .filter((p: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === p.id) === i)
    .filter((p: any) => p.id !== id)
    .slice(0, 3);
  const fbt = (
    fbtOverride.length ? fbtOverride.filter((p: any) => p.id !== id) : autoFbt
  ).slice(0, 3);
  // #2 — user can pick which of the FBT books to include (current book always in).
  const { addItemToCart } = useCart();
  const { guardAdd } = useChallengeGate();
  const [fbtOff, setFbtOff] = useState<Set<any>>(new Set());
  const fbtSelected = fbt.filter((p: any) => !fbtOff.has(p.id));
  const fbtTotal = fbtSelected.reduce((s: number, p: any) => s + (p.sale_price || p.price), 0) + payNow;
  const fbtWas = fbtSelected.reduce((s: number, p: any) => s + p.price, 0) + rawPrice;
  const addBundleToCart = async () => {
    // A bundle is not a discovery — during a challenge run these books don't count, so the
    // whole action is refused rather than quietly adding books that earn nothing.
    const ok = await guardAdd('bundle', (product as any)?.id);
    if (!ok) return;
    try {
      // all books belong to the same store — give FBT items the current book's
      // shop so the cart item always carries a valid shop_id for checkout.
      const withShop = (p: any) => ({ ...p, shop: p?.shop ?? (product as any)?.shop });
      addItemToCart(generateCartItem(withShop(product), {} as any), 1);
      fbtSelected.forEach((p: any) => addItemToCart(generateCartItem(withShop(p), {} as any), 1));
      toast.success(`${fbtSelected.length + 1}টি বই কার্টে যোগ হয়েছে`);
    } catch {
      toast.error('কার্টে যোগ করা যায়নি।');
    }
  };

  // #1 — has the logged-in user bought this book before?
  const { isAuthorized } = useUser();
  const { data: purchase } = useQuery(
    ['purchase-check', id],
    () => HttpClient.get<any>('purchase-check', { product_id: id }),
    { enabled: !!isAuthorized && !!id },
  );

  // ----- author detail (bio / photo) for the "About the author" section -----
  const { data: authorDetail } = useQuery(
    ['author-detail', author?.slug],
    () => HttpClient.get<any>(`authors/${author?.slug}`),
    { enabled: !!author?.slug },
  );

  const deal = useMidnightCountdown();
  const cutoff = useDeliveryCutoff();
  const viewers = useViewers(Number(id) || 7);

  // ----- WhatsApp order link (uses the store contact number if configured) -----
  const waNumber = String((settings as any)?.contactDetails?.contact ?? '').replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি "${name}" বইটি অর্ডার করতে চাই।`,
  );
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : `/contact`;

  const scrollDetails = () => {
    scroller.scrollTo('details', { smooth: true, offset: -80 });
  };

  return (
    <article className="mx-auto max-w-screen-xl bg-light px-4 py-6 sm:px-6 md:py-10 lg:px-8">
      {/* ===== deal urgency strip ===== */}
      {hasSaving && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#c0202c] to-[#e63946] px-4 py-2.5 text-center text-sm font-medium text-white">
          ⚡ Today&apos;s deal: extra savings on this title — offer ends in
          <span className="rounded bg-black/25 px-2 py-0.5 font-mono font-bold text-yellow-200">
            {deal}
          </span>
        </div>
      )}

      {/* ===== main: [gallery + info] | buy box ===== */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {/* ---------- gallery ---------- */}
          <div
            className="mx-auto w-full lg:sticky lg:top-24"
            style={{ maxWidth: single_max }}
          >
            {/* #1 — previously purchased notice */}
            {purchase?.purchased && (
              <Link
                href={`/orders/${purchase.tracking_number}`}
                className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-[#f4c4c8] bg-[#fdf0f1] px-3 py-2 text-xs font-semibold text-[#a3222c] transition hover:bg-[#fbe2e4]"
              >
                ✓ {purchase.date ? `${dayjs(purchase.date).format('D MMM YYYY')}-এ কেনা হয়েছে` : 'আগে কেনা হয়েছে'}
                <span className="underline">অর্ডার দেখুন →</span>
              </Link>
            )}
            {/* shade hugs the cover (no full-length stretch); rounded border */}
            <div
              className={`product-gallery relative overflow-hidden rounded-xl border border-border-200 bg-gray-100 p-2.5 ${
                video?.length ? 'book-product-video' : ''
              }`}
            >
              <ThumbsCarousel
                gallery={coverImages}
                video={video}
                hideThumbs={
                  coverImages.length && video?.length
                    ? false
                    : coverImages.length <= 1
                }
                aspectRatio="auto"
              />
              {insideImages.length > 0 && (
                <a
                  href="#inside-book"
                  className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-black/85"
                >
                  🔍 Look inside
                </a>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-body">
              <FavoriteButton productId={id} />
              <span>❤️ Add to wishlist</span>
            </div>
          </div>

          {/* ---------- info ---------- */}
          <div className="flex flex-col" ref={intersectionRef}>
            {name && (
              <h1 className="text-xl font-bold leading-snug tracking-tight text-heading lg:text-2xl">
                {name}
              </h1>
            )}

            {/* Mode A — resell listing badge: condition + seller */}
            {(product as any)?.is_resell && (product as any)?.resell_meta && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                <span className="rounded-full bg-amber-500 px-2 py-0.5 font-bold text-white">রিসেল বই</span>
                <span className="font-semibold text-amber-800">
                  অবস্থা: {({ like_new: 'প্রায় নতুন', good: 'ভালো কন্ডিশন', used: 'ব্যবহৃত', readable: 'পড়ার যোগ্য' } as any)[(product as any).resell_meta.condition] ?? (product as any).resell_meta.condition}
                </span>
                {(product as any).resell_meta.seller_name && (
                  <span className="text-amber-700">· বিক্রেতা: {(product as any).resell_meta.seller_name}</span>
                )}
                <span className="text-amber-700">
                  · ডেলিভারি: {(product as any).resell_meta.delivery_by === 'indobangla' ? 'IndoBangla (ঢাকায় ৳১২০)' : 'বিক্রেতা নিজে'}
                </span>
              </div>
            )}

            {/* Sold as-seen: the customer must know this *before* they buy. */}
            {(product as any)?.is_resell && (
              <div className="mt-2 rounded-lg border-2 border-dashed border-[#e63946] bg-[#fdf0f1] px-3 py-2.5">
                <div className="text-[13px] font-bold text-[#e63946]">
                  ⚠️ এই বইটি এক্সচেঞ্জ বা রিটার্ন করা যাবে না
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#8a4048]">
                  রিসেল (ব্যবহৃত) বই যেমন আছে তেমনই বিক্রি হয় — ছবি ও অবস্থা দেখে, <b>জেনেবুঝে</b> অর্ডার করুন।
                  এই অর্ডারে ৭ দিনের এক্সচেঞ্জ/রিটার্ন উইন্ডো থাকবে না।
                </p>
              </div>
            )}

            {(author?.name || manufacturer?.name) && (
              <p className="mt-1.5 text-sm leading-relaxed text-body">
                {author?.name && (
                  <>
                    By{' '}
                    <Link
                      href={Routes.author(author?.slug)}
                      className="font-semibold text-accent hover:underline"
                    >
                      {author?.name}
                      {(author as any)?.bangla_name ? ` || ${(author as any).bangla_name}` : ''}
                    </Link>
                    <br />
                  </>
                )}
                {manufacturer?.name && (
                  <>
                    Publisher:{' '}
                    <Link
                      href={Routes.manufacturer(manufacturer?.slug)}
                      className="font-semibold text-accent hover:underline"
                    >
                      {(manufacturer as any)?.bangla_name || manufacturer?.name}
                    </Link>
                  </>
                )}
              </p>
            )}

            {/* rating row — only when there are real reviews */}
            {totalReviews > 0 ? (
              <a
                href="#reviews"
                className="mt-2 flex flex-wrap items-center gap-2 text-sm"
              >
                <span className="text-base tracking-wide text-yellow-400">
                  {'★★★★★'.slice(0, Math.round(ratings))}
                  <span className="text-gray-300">
                    {'★★★★★'.slice(Math.round(ratings))}
                  </span>
                </span>
                <span className="font-semibold text-heading">{ratings.toFixed(1)}</span>
                <span className="text-accent">({totalReviews} reviews)</span>
              </a>
            ) : (
              <p className="mt-2 text-xs font-semibold text-[#1f7a52]">
                🆕 Fresh arrival — be among the first readers.
              </p>
            )}
            {Boolean(is_digital) && (
              <span className="mt-2 w-fit rounded bg-accent-400 px-3 py-1 text-xs text-white">
                {t('text-downloadable')}
              </span>
            )}

            <p className="mt-1.5 text-xs font-semibold text-[#1f7a52]">
              🔥 {30 + (Number(id) % 40)}+ readers viewed this in the last 24 hours
            </p>

            {/* ----- price box ----- */}
            <div className="mt-4 border-y border-border-200 py-4">
              {hasVariations ? (
                <div className="flex items-center gap-3">
                  <VariationPrice
                    selectedVariation={selectedVariation}
                    minPrice={product.min_price}
                    maxPrice={product.max_price}
                  />
                  {isSelected && discount && (
                    <span className="rounded-md bg-accent-200 px-2 py-1 text-xs font-semibold uppercase text-accent">
                      {discount} {t('text-off')}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    {savePct > 0 && (
                      <span className="text-xl font-semibold text-red-600">-{savePct}%</span>
                    )}
                    <ins className="text-3xl font-bold text-heading no-underline">{price}</ins>
                    {basePrice && (
                      <del className="text-base text-muted">{basePrice}</del>
                    )}
                  </div>
                  {hasSaving && (
                    <p className="mt-1 text-sm font-semibold text-[#1f7a52]">
                      You save {bdt(saveAmt)}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-body">
                    All taxes included · 100% original Indian edition
                  </p>
                </>
              )}
            </div>

            {/* ----- stacked offers (all visible, no horizontal scroll) ----- */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ['🏦', 'bKash offer', 'Extra ৳20 off on bKash payment'],
                ['🚚', 'Free delivery', 'On orders over ৳999 nationwide'],
                ['📚', 'Combo deal', 'Buy 2 books, get an extra 10% off'],
              ].map(([ic, title, sub]) => (
                <div
                  key={title}
                  className="rounded-lg border border-border-200 bg-gray-50 p-2.5 text-xs"
                >
                  <p className="font-bold text-heading">
                    {ic} {title}
                  </p>
                  <p className="mt-0.5 leading-snug text-body">{sub}</p>
                </div>
              ))}
            </div>

            {/* ----- trust icons ----- */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border-200 py-3 text-center sm:grid-cols-4">
              {[
                ['✅', '100% Authentic'],
                ['💵', 'Cash on Delivery'],
                ['↩️', '7-day Returns'],
                ['🇮🇳', 'India Imported'],
              ].map(([ic, lbl]) => (
                <div key={lbl} className="text-[11px] font-semibold text-accent">
                  <span className="mb-0.5 block text-xl">{ic}</span>
                  {lbl}
                </div>
              ))}
            </div>

            {/* ----- about bullets / short description ----- */}
            {content && (
              <div className="mt-4 text-sm leading-7 text-body react-editor-description">
                <Truncate
                  character={200}
                  {...(!isModal && {
                    onClick: () => scrollDetails(),
                    compressText: 'common:text-see-more',
                  })}
                >
                  {content}
                </Truncate>
              </div>
            )}

            {hasVariations && (
              <div className="mt-5">
                <VariationGroups variations={variations} variant="outline" />
              </div>
            )}

            {/* categories / tags */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!!categories?.length && (
                <BadgeGroups title={t('text-categories')}>
                  {categories.map((category: any) => (
                    <Link
                      href={`/${type?.slug}/search/?category=${category.slug}`}
                      key={category.id}
                      className="bg-transparent text-sm text-body after:content-[','] last:after:content-[''] hover:text-accent"
                    >
                      {category.name}
                    </Link>
                  ))}
                </BadgeGroups>
              )}
              {!!tags?.length && (
                <BadgeGroups title={t('text-tags')}>
                  {tags.map((tag: any) => (
                    <Link
                      href={`/${type?.slug}/search/?tags=${tag.slug}`}
                      key={tag.id}
                      className="bg-transparent text-sm text-body after:content-[','] last:after:content-[''] hover:text-accent"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </BadgeGroups>
              )}
            </div>
          </div>
        </div>

        {/* ---------- buy box (sticky) ---------- */}
        <aside className="h-fit rounded-xl border border-border-200 p-5 lg:sticky lg:top-24">
          <div className="text-2xl font-bold text-heading">{hasVariations ? price : price}</div>

          {/* stock / scarcity */}
          {qty > 0 ? (
            <div className="mt-3">
              <p className="text-base font-semibold text-[#1f7a52]">In stock</p>
              {qty <= 10 && (
                <>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded bg-gray-200">
                    <span
                      className="block h-full rounded bg-gradient-to-r from-[#e63946] to-[#c98a1e]"
                      style={{ width: `${Math.max(12, qty * 10)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    ⚠️ Only {qty} {qty === 1 ? 'copy' : 'copies'} left — order soon!
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="mt-3 text-base font-semibold text-red-600">Out of stock</p>
          )}

          {/* ---------- CTA ---------- */}
          {/* Buying is the point of this page, so the CTA sits directly under price + stock and
              never moves: the blocks below it (savings, pre-order) are conditional, and when they
              were above the button it jumped up the box on any book without a discount. */}
          <div className="mt-4 space-y-2">
            {/* Out of stock (and not a pre-order) → let them ask for a restock. */}
            {qty <= 0 && !(product as any)?.is_preorder ? (
              <RestockRequest productId={Number(id)} />
            ) : !is_external ? (
              <AddToCartAlt
                data={product}
                variant="bordered"
                variation={selectedVariation}
                disabled={selectedVariation?.is_disable || (hasVariations && !isSelected)}
              />
            ) : (
              <AddToCartExternal
                data={product}
                variant="bordered"
                variation={selectedVariation}
                disabled={selectedVariation?.is_disable || (hasVariations && !isSelected)}
              />
            )}
          </div>

          <p className="mt-4 text-sm text-body">
            🚚 Order within{' '}
            <span className="font-bold text-[#1f7a52]">{cutoff}</span> for next-day
            dispatch.
            <br />
            <span className="text-xs text-muted">Dhaka 24 hrs · outside Dhaka 2–3 days</span>
          </p>

          {/* value stack (Hormozi) */}
          {hasSaving && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                ✦ In your order
              </p>
              <div className="space-y-1 text-xs text-body">
                <div className="flex justify-between border-b border-dashed border-amber-200 py-0.5">
                  <span>This book</span>
                  <span className="font-semibold text-heading">{bdt(rawPrice)}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-amber-200 py-0.5">
                  <span>
                    Discount{' '}
                    <span className="font-semibold text-[#1f7a52]">({savePct}% off)</span>
                  </span>
                  <span className="font-semibold text-[#1f7a52]">− {bdt(saveAmt)}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-amber-200 py-0.5">
                  <span>Reward points credit</span>
                  <span className="font-semibold text-heading">
                    {bdt(Math.max(5, Math.round(payNow / 100) * 5))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t-2 border-accent pt-1 font-bold">
                  <span>You pay only</span>
                  <span className="text-accent">{bdt(payNow)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pre-order: buy before it lands in stock — advance required, no COD. */}
          {(product as any)?.is_preorder && (
            <div className="mt-4 rounded-xl border border-[#f4c4c8] bg-[#fdf0f1] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e63946] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  📖 প্রি-অর্ডার
                </span>
                {(product as any)?.preorder_until && (
                  <span className="text-[12px] font-semibold text-[#8a4048]">
                    {String((product as any).preorder_until).slice(0, 10)} পর্যন্ত
                  </span>
                )}
                {(product as any)?.preorder_limit ? (
                  <span className="text-[12px] font-semibold text-[#8a4048]">
                    · আর {Math.max(0, Number((product as any).preorder_limit) - Number((product as any).preorder_count || 0))} কপি বাকি
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8a4048]">
                বইটি এখনো হাতে আসেনি — আগেভাগে অর্ডার করে রাখুন। কমপক্ষে{' '}
                <b>{(product as any)?.preorder_advance_pct || 50}% অগ্রিম</b> দিতে হবে, বাকিটা ডেলিভারির সময়।
                <br />
                <b className="text-[#1f7a52]">পুরো ১০০% এখনই দিলে অতিরিক্ত ৫% ছাড়।</b>
              </p>
              <p className="mt-1 text-[11px] text-[#b06068]">প্রি-অর্ডারে ক্যাশ-অন-ডেলিভারি নেই।</p>
            </div>
          )}

          {/* secure / guarantee */}
          <div className="mt-4 space-y-1 text-xs text-body">
            <p>🔒 Secure checkout — bKash · Nagad · COD</p>
            <p>↩️ 7-day easy return policy</p>
            <p>📦 Sold &amp; shipped by <span className="font-semibold text-heading">IndoBangla</span></p>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#fdf6e6] py-2 text-xs font-semibold text-[#96671a]">
            👀 {viewers} people are viewing this right now
          </div>
        </aside>
      </div>

      {/* ===== inside the book (gallery images, kept separate from the cover) ===== */}
      {insideImages.length > 0 && (
        <section id="inside-book" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-bold text-heading">📖 বইয়ের ভেতরে এক ঝলক</h2>
          <p className="mb-4 mt-1 text-sm text-body">
            Inside pages &amp; preview of this book.
          </p>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {insideImages.map((img: any, i: number) => (
              <a
                key={i}
                href={img.original || img.thumbnail}
                target="_blank"
                rel="noreferrer"
                className="group relative block shrink-0 snap-start overflow-hidden rounded-lg border border-border-200 bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnail || img.original}
                  alt={`Inside page ${i + 1}`}
                  className="h-40 w-auto object-contain transition-transform duration-200 group-hover:scale-105 sm:h-48"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ===== frequently bought together ===== */}
      {fbt.length >= 1 && (
        <section className="mt-10 rounded-xl border border-border-200 bg-gray-50 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-heading">✨ Frequently bought together</h2>
          <p className="mb-4 mt-1 text-sm text-body">
            Readers who bought this book often add these — save more together.
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-start justify-center gap-2">
              <div className="w-24 text-center text-xs">
                <div className="relative">
                  <span className="absolute left-1 top-1 z-[1] flex h-5 w-5 items-center justify-center rounded bg-accent text-[11px] font-bold text-white">✓</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image?.original ?? '/product-placeholder.svg'}
                    alt={name}
                    style={{ height: fbt_h }}
                    className="mx-auto mb-1.5 w-auto rounded object-contain shadow"
                  />
                </div>
                <p className="line-clamp-2 font-semibold text-heading">{name}</p>
                <p className="font-bold text-accent">{bdt(payNow)}</p>
                <p className="mt-0.5 text-[10px] text-body">এই বই</p>
              </div>
              {fbt.map((p: any) => {
                const on = !fbtOff.has(p.id);
                return (
                  <div key={p.id} className="flex items-start gap-2">
                    <span className="mt-16 text-xl font-bold text-body">+</span>
                    <div className="w-24 text-center text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setFbtOff((prev) => {
                            const next = new Set(prev);
                            next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                            return next;
                          })
                        }
                        className={`relative block w-full rounded ${on ? '' : 'opacity-40 grayscale'}`}
                        aria-label={on ? 'remove from bundle' : 'add to bundle'}
                      >
                        <span className={`absolute left-1 top-1 z-[1] flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${on ? 'border-accent bg-accent text-white' : 'border-gray-300 bg-white text-transparent'}`}>✓</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image?.original || p.image || '/product-placeholder.svg'}
                          alt={p.name}
                          style={{ height: fbt_h }}
                          className="mx-auto mb-1.5 w-auto rounded object-contain shadow"
                        />
                      </button>
                      <Link href={`/products/${p.slug}`} className="line-clamp-2 font-semibold text-heading hover:text-accent">
                        {p.name}
                      </Link>
                      <p className="font-bold text-accent">{bdt(p.sale_price || p.price)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-dashed border-accent bg-accent/5 p-4 lg:w-60">
              <div className="flex justify-between text-sm text-body">
                <span>Total ({fbtSelected.length + 1} books)</span>
                <span className="line-through">{bdt(fbtWas)}</span>
              </div>
              <div className="mt-1 flex justify-between text-base font-bold text-heading">
                <span>Bundle price</span>
                <span className="text-accent">{bdt(fbtTotal)}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#1f7a52]">
                You save {bdt(Math.max(0, fbtWas - fbtTotal))} 🎉
              </p>
              <button
                onClick={addBundleToCart}
                className="mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
              >
                নির্বাচিত {fbtSelected.length + 1}টি কার্টে যোগ করুন
              </button>
              <p className="mt-1.5 text-center text-[10px] text-body">ছবিতে টিক দিয়ে বই বাদ/যোগ করুন</p>
            </div>
          </div>
        </section>
      )}

      {/* ===== what's inside / at a glance ===== */}
      {book && Object.values(book).some((v) => v) && (
        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-6">
          <p className="mb-1 text-sm italic text-accent">At a glance</p>
          <h2 className="mb-5 text-xl font-bold tracking-tight text-heading lg:text-2xl">
            এই বইয়ে যা পাবেন
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [book.page_number, 'Pages'],
              [book.language, 'Language'],
              [book.print_type, 'Binding'],
              [book.edition, 'Edition'],
              [book.condition, 'Condition'],
              [book.printed_country || manufacturer?.name, 'Origin'],
            ]
              .filter(([v]) => v)
              .map(([v, l], i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow"
                >
                  <div className="truncate text-xl font-bold text-green-800 sm:text-2xl">
                    {v as string}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-body">{l as string}</div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ===== details table ===== */}
      <Element name="details" className="mt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight text-heading lg:text-2xl">
          {t('text-details')}
        </h2>
        {book && (book as any)?.hook && (
          <blockquote className="my-5 max-w-3xl border-l-4 pl-5 text-lg italic leading-relaxed text-green-900 [border-color:#c98a1e]">
            “{(book as any).hook}”
          </blockquote>
        )}
        {content && (
          <h2 className="mb-3 text-xl font-bold tracking-tight text-heading lg:text-2xl">
            Product description
          </h2>
        )}
        {content && (
          <div
            className="react-editor-description mb-6 max-w-3xl text-[15px] leading-8 text-body"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-border-200">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Title', name],
                ['Author', author?.name],
                ['Publisher', manufacturer?.name],
                ['Language', book?.language],
                ['Binding', book?.print_type],
                ['Pages', book?.page_number],
                ['Edition', book?.edition],
                ['Condition', book?.condition],
                ['ISBN-13', book?.isbn13],
                ['ISBN-10', book?.isbn10],
                ['Reading level', book?.reading_level],
                ['Printed country', book?.printed_country],
                ['Item weight', book?.item_weight],
                [
                  'Dimensions',
                  [book?.height, book?.width, book?.length].filter(Boolean).join(' × '),
                ],
                ['SKU', hasVariations ? selectedVariation?.sku : sku],
              ]
                .filter(([, v]) => v)
                .map(([labelText, value]) => (
                  <tr key={labelText as string} className="border-b border-border-200 last:border-0 even:bg-gray-50/60">
                    <td className="w-2/5 whitespace-nowrap bg-gray-50 px-3 py-2.5 align-top font-semibold text-heading">
                      {labelText}
                    </td>
                    <td className="break-words px-3 py-2.5 text-body">{value as string}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Element>

      {/* ===== About the author (Amazon-style) ===== */}
      {author?.name && (
        <section className="mt-10 border-t border-border-200 pt-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-heading lg:text-2xl">
            About the author
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {(authorDetail?.image?.original || author?.logo) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authorDetail?.image?.original || author?.logo}
                alt={author.name}
                className="mx-auto h-28 w-28 shrink-0 rounded-full object-cover shadow sm:mx-0"
              />
            )}
            <div className="flex-1">
              <Link
                href={Routes.author(author.slug)}
                className="text-lg font-bold text-heading hover:text-accent"
              >
                {author.name}
              </Link>
              {authorDetail?.born && (
                <p className="mt-0.5 text-xs text-body">জন্ম: {authorDetail.born}</p>
              )}
              {authorDetail?.quote && (
                <p className="mt-2 text-sm italic text-amber-800">“{authorDetail.quote}”</p>
              )}
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-body">
                {authorDetail?.bio
                  ? authorDetail.bio
                  : `${author.name}-এর আরও বই ঘুরে দেখুন। এই লেখকের লেখা পাঠকদের কাছে বিশেষভাবে সমাদৃত।`}
              </p>
              <Link
                href={Routes.author(author.slug)}
                className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
              >
                {author.name}-এর সব বই →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== From the Publisher (Amazon-style) ===== */}
      {manufacturer?.name && (
        <section className="mt-10 border-t border-border-200 pt-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-heading lg:text-2xl">
            From the Publisher
          </h2>
          <div className="flex flex-col gap-5 rounded-xl border border-border-200 bg-gray-50 p-5 sm:flex-row sm:items-center">
            {(manufacturer as any)?.image?.original || (manufacturer as any)?.image?.thumbnail || (manufacturer as any)?.logo?.original ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(manufacturer as any)?.image?.original || (manufacturer as any)?.image?.thumbnail || (manufacturer as any)?.logo?.original}
                alt={manufacturer.name}
                className="mx-auto h-20 w-20 shrink-0 rounded-lg bg-white object-contain p-1 sm:mx-0"
              />
            ) : (
              <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-2xl sm:mx-0">
                📚
              </div>
            )}
            <div className="flex-1">
              <Link
                href={Routes.manufacturer(manufacturer.slug)}
                className="text-lg font-bold text-heading hover:text-accent"
              >
                {manufacturer.name}
              </Link>
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-body">
                {manufacturer.name} প্রকাশনীর প্রকাশিত বই — মানসম্মত ছাপা, নির্ভরযোগ্য সংস্করণ।
                এই প্রকাশনীর আরও বই দেখুন।
              </p>
              <Link
                href={Routes.manufacturer(manufacturer.slug)}
                className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
              >
                {manufacturer.name}-এর সব বই →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Customer-reviews summary moved to the end of the page (page composition). */}

      {/* ===== sticky mobile buy bar ===== */}
      {!isModal && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border-200 bg-light p-3 shadow-[0_-4px_14px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="min-w-[70px] text-base font-bold text-accent">{price}</div>
          <div className="flex-1">
            {!is_external ? (
              <AddToCartAlt
                data={product}
                variant="bordered"
                variation={selectedVariation}
                disabled={selectedVariation?.is_disable || (hasVariations && !isSelected)}
              />
            ) : (
              <a
                href={external_product_url}
                className="flex w-full items-center justify-center rounded-full bg-accent py-2.5 text-sm font-bold text-white"
              >
                {t('text-buy-now')}
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default BookDetails;
