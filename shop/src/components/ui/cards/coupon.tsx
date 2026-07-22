import { useRef, useState, useEffect } from 'react';
import { Image } from '@/components/ui/image';
import cn from 'classnames';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useTranslation } from 'next-i18next';
import { Coupon } from '@/types';
import { VerifyIcon } from '@/components/icons/verify-icon';

type CouponCardProps = {
  coupon: Coupon;
  className?: string;
};

const bn = (v: string | number) =>
  String(v).replace(/[0-9]/g, (d) => "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF"[Number(d)]);

/** Six brand-adjacent duotones. Picked by hashing the code, so a coupon always draws the
 *  same cover — a random colour per render would make the page flicker on every load. */
const COVERS = [
  ['#EF3543', '#B4121E'],
  ['#2F6B5E', '#17403A'],
  ['#C9A24B', '#8A6A21'],
  ['#4A5A7A', '#26314A'],
  ['#8A5A3B', '#5A3720'],
  ['#6D3F73', '#40214A'],
];

function GeneratedCover({ coupon }: { coupon: any }) {
  const code: string = coupon?.code ?? '';
  const hash = Array.from(code).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const [from, to] = COVERS[hash % COVERS.length];

  const isPct = coupon?.type === 'percentage';
  const amount = Number(coupon?.amount) || 0;
  const min = Number(coupon?.minimum_cart_amount) || 0;

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4 text-center"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* faint ticket notches so it reads as a coupon, not a coloured box */}
      <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gray-200" />
      <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gray-200" />
      <span className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed border-white/25" />

      <span className="relative z-[1] text-4xl font-extrabold leading-none text-white drop-shadow-sm">
        {isPct ? `${bn(amount)}%` : `\u09F3${bn(amount)}`}
      </span>
      <span className="relative z-[1] mt-1 text-[13px] font-bold uppercase tracking-wider text-white/90">
        ছাড়
      </span>
      {min > 0 && (
        <span className="relative z-[1] mt-2.5 rounded-full bg-black/25 px-3 py-1 text-[11px] font-semibold text-white/90">
          ন্যূনতম ৳{bn(min)} কিনলে
        </span>
      )}
    </div>
  );
}

const CouponCard: React.FC<CouponCardProps> = ({ coupon, className }) => {
  const { t } = useTranslation('common');
  const { code, image, target } = coupon;
  const c: any = coupon;
  const [copyText, setCopyText] = useState({
    value: code,
    copied: false,
  });

  useEffect(() => {
    let timeout: any;
    if (copyText.copied) {
      timeout = setTimeout(() => {
        setCopyText((prev) => ({
          ...prev,
          copied: false,
        }));
      }, 3500);
    }
    return () => clearTimeout(timeout);
  }, [copyText.copied]);

  return (
    <div className={cn('coupon-card', className)}>
      <div className="relative flex h-[12.5rem] overflow-hidden rounded bg-gray-200">
        {image?.thumbnail ? (
          <>
            <div
              className="absolute left-0 top-0 h-full w-full bg-cover bg-center bg-no-repeat blur-sm"
              style={{ backgroundImage: `url(${image?.thumbnail})` }}
            />
            <Image
              src={image.thumbnail}
              alt={code}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              fill
              quality={100}
              style={{ objectFit: 'contain' }}
            />
          </>
        ) : (
          // No cover was ever uploaded for these coupons, so every card fell back to one
          // shared placeholder image — the offers page looked like the same coupon repeated.
          // Draw a cover from the coupon's own data instead: it always exists, needs no
          // upload or storage, and states the real offer instead of decorating around it.
          <GeneratedCover coupon={c} />
        )}
      </div>
      <div className="grid items-center w-11/12 grid-flow-col px-5 py-4 mx-auto rounded-bl shadow-sm rounded-be auto-cols-fr bg-light">
        <>
          <span className="flex items-center font-semibold uppercase text-heading focus:outline-none gap-1.5">
            {copyText.value}{' '}
            {target ? <VerifyIcon className="w-3.5 h-3.5 text-accent" /> : ''}
          </span>

          {!copyText.copied && (
            <CopyToClipboard
              text={copyText.value}
              onCopy={() =>
                setCopyText((prev) => ({
                  ...prev,
                  copied: true,
                }))
              }
            >
              <button className="text-sm font-semibold transition-colors duration-200 text-accent hover:text-accent-hover focus:text-accent-hover focus:outline-0 ltr:text-right rtl:text-left">
                <span>{t('text-copy')}</span>
              </button>
            </CopyToClipboard>
          )}

          {copyText.copied && (
            <div className="text-sm font-semibold text-accent ltr:text-right rtl:text-left">
              {t('text-copied')}
            </div>
          )}
        </>
      </div>
    </div>
  );
};

export default CouponCard;
