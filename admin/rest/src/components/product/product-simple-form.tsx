import Input from '@/components/ui/input';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import { useEffect, useState } from 'react';
import { HttpClient } from '@/data/client/http-client';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import Label from '@/components/ui/label';
import FileInput from '@/components/ui/file-input';
import Checkbox from '@/components/ui/checkbox/checkbox';
import { Config } from '@/config';
import { useRouter } from 'next/router';
import Alert from '@/components/ui/alert';
import { SettingsOptions } from '@/types';
import TextArea from '@/components/ui/text-area';
import ProductGiftInput from '@/components/product/product-gift-input';

type IProps = {
  initialValues: any;
  settings: SettingsOptions | undefined;
};

export default function ProductSimpleForm({ initialValues, settings }: IProps) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { t } = useTranslation();
  const { locale } = useRouter();
  const isTranslateProduct = locale !== Config.defaultLanguage;

  // #7 — Printed country drives the price. A non-Bangladesh book converts MRP with the
  // conversion rate (honouring any per-category preset from Settings → Conversion Rate);
  // a Bangladesh book needs no conversion, so the box is hidden and price is entered directly.
  const mrp = watch('mrp');
  const printedCountry = (watch('book.printed_country') || '').trim();
  const categories = watch('categories');
  const isBd = printedCountry === 'Bangladesh';
  const [convHint, setConvHint] = useState<string>('');

  const catIds = Array.isArray(categories)
    ? categories.map((c: any) => c?.id).filter(Boolean)
    : [];
  const catKey = catIds.join(',');

  // Keep the stored book_origin in sync so the backend reprice/apply path stays correct.
  useEffect(() => {
    setValue('book_origin', isBd ? 'bd' : 'indian', { shouldDirty: false });
  }, [isBd, setValue]);

  useEffect(() => {
    if (isBd) {
      setConvHint('');
      return;
    }
    const m = Number(mrp);
    if (!m || m <= 0) {
      setConvHint('');
      return;
    }
    let cancelled = false;
    HttpClient.get<any>('conversion-preview', {
      mrp: m,
      country: printedCountry || 'India',
      category_ids: catKey,
    })
      .then((r: any) => {
        if (cancelled) return;
        if (r?.price) {
          setValue('price', r.price, { shouldDirty: true });
          if (r?.sale_price) setValue('sale_price', r.sale_price, { shouldDirty: true });
          const src =
            r?.source && String(r.source).startsWith('category:')
              ? ` (${String(r.source).slice(9)} preset)`
              : '';
          setConvHint(
            `MRP ${m} × ${r.rate}${src} = ৳${r.price}${r.sale_price ? ` · sale ৳${r.sale_price}` : ''}`,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrp, printedCountry, isBd, catKey]);

  const is_digital = watch('is_digital');
  const is_external = watch('is_external');
  const is_update_message = watch('inform_purchased_customer');

  return (
    <div className="my-5 flex flex-wrap sm:my-8">
      <Description
        title={t('form:form-title-simple-product-info')}
        details={`${
          initialValues
            ? t('form:item-description-edit')
            : t('form:item-description-add')
        } ${t('form:form-description-simple-product-info')}`}
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />

      <Card className="w-full sm:w-8/12 md:w-2/3">
        {/* #7 — Printed country drives the conversion. Non-Bangladesh → MRP × rate box.
            Bangladesh → no box, price is entered directly below. */}
        {isBd ? (
          <p className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-[11px] font-semibold text-emerald-700">
            🇧🇩 বাংলাদেশি বই (Printed country = Bangladesh) — কোনো কনভার্সন লাগবে না, নিচে সরাসরি দাম দিন।
          </p>
        ) : (
          <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
            <Input
              label="MRP (আসল কভার প্রাইস)"
              {...register('mrp')}
              type="number"
              variant="outline"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                🌍 {printedCountry || 'বিদেশি'} বই — MRP × conversion rate
              </span>
              {convHint && <span className="text-xs font-semibold text-emerald-700">💱 {convHint}</span>}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Printed country বাংলাদেশ না হলে MRP দিলে দাম স্বয়ংক্রিয়ভাবে conversion rate অনুযায়ী বসবে।
              রেট বদলাতে Settings → Conversion Rate — ক্যাটাগরি অনুযায়ী প্রিসেটও (যেমন Magazine) ওখানে সেট করা যায়।
            </p>
          </div>
        )}

        {/* Pre-order: opens the book for orders before it's in stock. */}
        <div className="mb-5 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[#e63946]" {...register('is_preorder')} />
            📖 প্রি-অর্ডার চালু করুন
          </label>
          <p className="mt-1 text-[11px] text-slate-500">
            স্টকে না থাকলেও অর্ডার নেওয়া যাবে। কাস্টমারকে কমপক্ষে <b>{watch('preorder_advance_pct') || 50}%</b> অগ্রিম দিতে হবে;
            পুরো ১০০% দিলে <b>অতিরিক্ত {watch('preorder_full_pay_discount_pct') ?? 5}% ছাড়</b> পাবে ({Number(watch('preorder_full_pay_discount_pct')) === 0 ? 'এই বইয়ে বন্ধ' : '০ দিলে বন্ধ'})। প্রি-অর্ডার থাকলে ক্যাশ-অন-ডেলিভারি দেখাবে না।
          </p>
          {watch('is_preorder') && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>কত তারিখ পর্যন্ত</Label>
                <input type="date" {...register('preorder_until')}
                  className="mt-0.5 h-12 w-full rounded border border-border-base px-3 text-sm focus:border-accent focus:outline-none" />
              </div>
              <Input label="কপি সীমা (খালি = সীমাহীন)" {...register('preorder_limit')} type="number" variant="outline" placeholder="সীমাহীন" />
              <Input label="অগ্রিম %" {...register('preorder_advance_pct')} type="number" variant="outline" placeholder="50" />
              <Input label="পূর্ণ-পেমেন্ট ছাড় % (0 = বন্ধ)" {...register('preorder_full_pay_discount_pct')} type="number" variant="outline" placeholder="5" />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 sm:col-span-2 lg:col-span-4">
                <input type="checkbox" className="h-3.5 w-3.5 accent-[#e63946]" {...register('preorder_show_count')} />
                👁️ শপে "আর X কপি বাকি" দেখান (আনচেক করলে সংখ্যাটা লুকানো থাকবে)
              </label>
            </div>
          )}
        </div>

        <ProductGiftInput control={control} register={register} />
        <Input
          label={`${t('form:input-label-price')}*`}
          {...register('price')}
          type="number"
          error={t(errors.price?.message!)}
          variant="outline"
          className="mb-5"
        />
        <Input
          label={t('form:input-label-sale-price')}
          type="number"
          {...register('sale_price')}
          error={t(errors.sale_price?.message!)}
          variant="outline"
          className="mb-5"
        />

        <Input
          // No asterisk: quantity is optional now, and 0 is a valid value (out of stock).
          label={t('form:input-label-quantity')}
          type="number"
          min={0}
          {...register('quantity')}
          error={t(errors.quantity?.message!)}
          variant="outline"
          className="mb-5"
          // Need discussion
          disabled={isTranslateProduct}
        />

        <Input
          label={`${t('form:input-label-sku')}*`}
          {...register('sku')}
          note={
            Config.enableMultiLang
              ? `${t('form:input-note-multilang-sku')}`
              : ''
          }
          error={t(errors.sku?.message!)}
          variant="outline"
          className="mb-5"
          disabled={isTranslateProduct}
        />

        {/* #8 — width / height / length hidden for the book store (not needed). */}
        <Checkbox
          {...register('is_digital')}
          id="is_digital"
          label={t('form:input-label-is-digital')}
          disabled={Boolean(is_external)}
          className="mb-5"
        />

        <Checkbox
          {...register('is_external')}
          id="is_external"
          label={t('form:input-label-is-external')}
          disabled={Boolean(is_digital)}
          className="mb-5"
        />

        {is_digital ? (
          <>
            <Label>{t('form:input-label-digital-file')}</Label>
            <FileInput
              name="digital_file_input"
              control={control}
              multiple={false}
              acceptFile={true}
            />
            <Alert
              message={t('form:info-about-digital-product')}
              variant="info"
              closeable={false}
              className="mt-5 mb-5"
            />
            <input type="hidden" {...register(`digital_file`)} />

            {settings?.enableEmailForDigitalProduct ? (
              <div className="mt-5 mb-5">
                <Checkbox
                  {...register('inform_purchased_customer')}
                  id="inform_purchased_customer"
                  label="Send email to already purchased customer of this item about this update."
                  // disabled={Boolean(is_external)}
                  className="mb-5"
                />
                {is_update_message ? (
                  <TextArea
                    {...register('product_update_message')}
                    id="product_update_message"
                    label="You can send message towards customer about this update."
                    variant="outline"
                    className="col-span-2"
                    placeholder="(Optional)"
                  />
                ) : null}
              </div>
            ) : null}

            {errors.digital_file_input && (
              <p className="my-2 text-xs text-red-500 text-start">
                {t('form:error-digital-file-is-required')}
              </p>
            )}
          </>
        ) : null}
        {is_external ? (
          <div>
            <Input
              label={t('form:input-label-external-product-url')}
              {...register('external_product_url')}
              error={t(errors.external_product_url?.message!)}
              variant="outline"
              className="mb-5"
            />
            <Input
              label={t('form:input-label-external-product-button-text')}
              {...register('external_product_button_text')}
              error={t(errors.external_product_button_text?.message!)}
              variant="outline"
              className="mb-5"
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
