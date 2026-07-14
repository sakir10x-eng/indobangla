import ProductCard from '@/components/products/cards/card';
import Button from '@/components/ui/button';
import CountdownTimer from '@/components/ui/countdown-timer';
import NotFound from '@/components/ui/not-found';
import SectionBlockElegant from '@/components/ui/section-block-elegant';
import { Routes } from '@/config/routes';
import { useFlashSale } from '@/framework/flash-sales';
import { cn } from '@/lib/cn';
import rangeMap from '@/lib/range-map';
import { useHasMounted } from '@/lib/use-has-mounted';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ProductLoader from '@/components/ui/loaders/product-loader';
import ErrorMessage from '@/components/ui/error-message';
import { useMemo } from 'react';

interface Props {
  className?: string;
  variables: any;
}

export default function FlashSaleProducts({ className, variables }: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { locale } = router;
  const { flashSale, loading, error } = useFlashSale({
    slug: variables?.campaign as string,
    language: locale as string,
  });

  const hasMounted = useHasMounted();

  const products = useMemo(() => {
    return flashSale?.products?.slice(0, 10);
  }, [flashSale]);

  if (!hasMounted) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-y-10 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] xl:gap-8 xl:gap-y-12 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] 3xl:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] px-5 lg:px-7 xl:px-10 gap-8 pb-24 pt-16 md:pt-20 xl:pt-[100px] 3xl:pt-[120px]">
        {rangeMap(10, (i) => (
          <ProductLoader uniqueKey={`product-${i}`} key={i} />
        ))}
      </div>
    );
  }

  if (error) return <ErrorMessage message={error?.message} />;

  if (!products?.length) {
    return (
      <SectionBlockElegant
        title={flashSale?.title}
        description={flashSale?.description!}
      >
        <NotFound text="text-not-found" className="mx-auto w-1/4" />
      </SectionBlockElegant>
    );
  }

  return (
    <SectionBlockElegant
      title={flashSale?.title}
      description={flashSale?.description!}
      extraElement={
        flashSale?.start_date && flashSale?.end_date ? (
          <>
            {new Date(flashSale?.start_date).valueOf() > Date.now() ? (
              <CountdownTimer
                date={new Date(flashSale?.start_date)}
                title="Sale Starts In:"
                className="mt-3 text-heading [&>p]:bg-dark"
                titleClassName="text-base"
              />
            ) : new Date(flashSale?.end_date).valueOf() > Date.now() ? (
              <CountdownTimer
                date={new Date(flashSale?.end_date)}
                title="Sale Ends In:"
                className="mt-3 text-heading [&>p]:bg-dark"
                titleClassName="text-base"
              />
            ) : null}
          </>
        ) : null
      }
    >
      <div className={cn('w-full', className)}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 gap-y-10 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] xl:gap-8 xl:gap-y-12 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] 3xl:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
          {products?.map((product: any) => (
            <ProductCard
              product={product}
              cardType={variables?.productCard}
              key={product?.id}
            />
          ))}
        </div>
        {flashSale?.slug && products?.length >= 10 && (
          <div className="flex justify-center mt-8 lg:mt-12">
            <Button
              onClick={() =>
                router.push(Routes.flashSaleSingle(flashSale?.slug))
              }
              className="text-sm font-semibold h-11 md:text-base"
            >
              {t('text-see-all')}
            </Button>
          </div>
        )}
      </div>
    </SectionBlockElegant>
  );
}
