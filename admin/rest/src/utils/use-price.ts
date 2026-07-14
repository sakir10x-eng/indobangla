import { useMemo } from 'react';
import { siteSettings } from '@/settings/site.settings';
import { useSettings } from '@/contexts/settings.context';
import { useRouter } from 'next/router';
export function formatPrice({
  amount,
  currencyCode,
  locale,
  fractions = 2,
}: {
  amount: number;
  currencyCode: string;
  locale: string;
  fractions: number;
}) {
  // Taka: Intl renders BDT as the text "BDT" (and as "$" whenever the currency
  // setting is missing), so format the ৳ symbol ourselves. Prices are whole taka.
  if (!currencyCode || currencyCode === 'BDT') {
    return '৳' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(amount));
  }

  const formatCurrency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits:
      fractions > 20 || fractions < 0 || !fractions ? 2 : fractions,
  });

  return formatCurrency.format(amount);
}

export function formatVariantPrice({
  amount,
  baseAmount,
  currencyCode,
  locale,
  fractions = 2,
}: {
  baseAmount: number;
  amount: number;
  currencyCode: string;
  locale: string;
  fractions: number;
}) {
  const hasDiscount = baseAmount > amount;
  const formatDiscount = new Intl.NumberFormat(locale, { style: 'percent' });
  const discount = hasDiscount
    ? formatDiscount.format((amount - baseAmount) / amount)
    : null;
  const price = formatPrice({ amount, currencyCode, locale, fractions });
  const basePrice = hasDiscount
    ? formatPrice({ amount: baseAmount, currencyCode, locale, fractions })
    : null;

  return { price, basePrice, discount };
}
type PriceProps = {
  amount: number;
  baseAmount?: number;
  currencyCode?: string;
};
export default function usePrice(
  data?: {
    amount: number;
    baseAmount?: number;
    currencyCode?: string;
  } | null,
) {
  const { settings, isLoading } = useSettings();
  const { locale } = useRouter();

  const currency = settings?.currency;
  const currencyOptions = settings?.currencyOptions;

  const { amount, baseAmount, currencyCode, currencyOptionsFormat } = {
    ...data,
    currencyCode: currency ?? 'BDT',
    currencyOptionsFormat: currencyOptions ?? {
      formation: 'en-IN',
      fractions: 0,
    },
  };

  const { formation = 'en-US', fractions = 2 } = currencyOptionsFormat!;

  const value = useMemo(() => {
    if (isLoading) {
      return '';
    }

    if (typeof amount !== 'number' || !currencyCode) return '';
    const fractionalDigit = fractions ?? 2;
    const currentLocale = formation ?? 'en';

    return baseAmount
      ? formatVariantPrice({
          amount,
          baseAmount,
          currencyCode,
          locale: currentLocale,
          fractions: fractionalDigit,
        })
      : formatPrice({
          amount,
          currencyCode,
          locale: currentLocale,
          fractions: fractionalDigit,
        });
  }, [
    amount,
    baseAmount,
    currencyCode,
    locale,
    formation,
    fractions,
    isLoading,
    settings,
  ]);

  // Handle loading state after all hooks are called
  if (isLoading) {
    return { price: '', basePrice: null, discount: null };
  }

  return typeof value === 'string'
    ? { price: value, basePrice: null, discount: null }
    : value;
}
