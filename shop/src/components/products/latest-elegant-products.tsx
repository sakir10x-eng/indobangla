import CustomRender from '@/components/builder/CustomRender';
import Platinum from '@/components/products/cards/platinum';
import ErrorMessage from '@/components/ui/error-message';
import ProductListLoader from '@/components/ui/loaders/product-list-loader';
import NotFound from '@/components/ui/not-found';
import SectionBlockElegant from '@/components/ui/section-block-elegant';
import { useLatestProducts } from '@/framework/product';
import { cn } from '@/lib/cn';
import rangeMap from '@/lib/range-map';
import classNames from 'classnames';

interface Props {
  className?: string;
  limit?: number;
  variables: any;
  title?: string;
  description?: string;
  banner?: any;
}

export default function LatestElegantProducts({
  className,
  limit = 9,
  variables,
  title,
  description,
  banner,
}: Props) {
  // const { locale } = useRouter();

  const { products, isLoading, error } = useLatestProducts({
    ...variables,
    limit: limit,
  });

  if (error) return <ErrorMessage message={error.message} />;

  const modifiedBannerData = Boolean(banner?.content?.length)
    ? {
        content: [banner.content[0]],
        root: banner.root,
        zones: { ...banner.zones },
      }
    : {};

  return (
    <SectionBlockElegant title={title} description={description}>
      <div className={classNames('w-full grid grid-cols-12 gap-5', className)}>
        {Boolean(modifiedBannerData?.content?.length) && (
          <div className="order-2 lg:order-1 col-span-full lg:col-span-3">
            <div className="h-full">
              <CustomRender data={modifiedBannerData} />
            </div>
          </div>
        )}

        <div
          className={cn(
            'order-1 lg:order-2 col-span-full lg:col-span-9 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 gap-y-7 2xl:grid-cols-[repeat(auto-fill,minmax(390px,1fr))]',
            !Boolean(modifiedBannerData?.content?.length) && 'lg:col-span-full',
          )}
        >
          {!isLoading && !products?.length && (
            <div className="col-span-full">
              <NotFound text="text-not-found" className="mx-auto w-1/4" />
            </div>
          )}
          {isLoading && !products?.length
            ? rangeMap(limit, (i) => (
                <ProductListLoader uniqueKey={`product-${i}`} key={i} />
              ))
            : products?.map((product: any) => (
                <Platinum product={product} key={product?.id} variant="mini" />
              ))}
        </div>
      </div>
    </SectionBlockElegant>
  );
}
