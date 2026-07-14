import Card from '@/components/common/card';
import { GroupConfig } from '@/components/group/builder';
import { PencilIcon } from '@/components/icons/pencil-icon';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import SelectInput from '@/components/ui/select-input';
import SwitchInput from '@/components/ui/switch-input';
import { Routes } from '@/config/routes';
import { Config as PuckConfig, Render } from '@measured/puck';
import { isArray, isEmpty } from 'lodash';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ElegantFormPartProps } from '@/components/group/form-parts/type';
import { cn } from '@/lib/utils';
import { twMerge } from 'tailwind-merge';

export default function ElegantFormPart({
  initialValues,
  control,
  register,
  errors,
  flashSalesEnable,
  flashSale,
  loadingFlashSales,
  categoryEnable,
  trendingProductsEnable,
  trendingProductsBannerData,
  groupName,
  setTrendingProductsBannerData,
  addSectionOnClickHandler,
  featuredBrandsEnable,
  latestProductsEnable,
  latestProductsBannerData,
  setLatestProductsBannerData,
  className,
  setData,
  layoutType,
  data,
  ...props
}: ElegantFormPartProps) {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation();

  return (
    <div
      className={twMerge(
        cn(
          'flex flex-wrap pb-8 my-5 border-b border-dashed border-border-base sm:my-8',
          className,
        ),
      )}
      {...props}
    >
      <Description
        title={t('form:text-layout-content-settings')}
        details={t('form:text-please-set-your-layout-content-here')}
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />
      <Card className="w-full sm:w-8/12 md:w-2/3">
        <div className="grid gap-5">
          {/* Flash Sale */}
          <div className="flex items-center gap-x-4">
            <SwitchInput name="settings.flashSales.enable" control={control} />
            <Label
              htmlFor="settings.flashSales.enable"
              className="mb-0 cursor-pointer"
            >
              Enable Flash Sales?
            </Label>
          </div>
          {flashSalesEnable ? (
            <div>
              <Label className="capitalize">
                {t('text-campaign')}{' '}
                <span className="ml-0.5 text-red-500">*</span>
              </Label>
              <SelectInput
                name="settings.flashSales.campaign"
                control={control}
                getOptionLabel={(option: any) => option.title}
                getOptionValue={(option: any) => option.id}
                options={flashSale}
                isClearable={true}
                isLoading={loadingFlashSales}
                error={t(errors?.settings?.flashSales?.campaign?.message)}
              />
            </div>
          ) : (
            ''
          )}
          {/* Popular Category */}
          <div className="flex items-center gap-x-4">
            <SwitchInput name="settings.category.enable" control={control} />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.category.enable"
            >
              Enable Category?
            </Label>
          </div>
          {categoryEnable ? (
            <>
              <Input
                label={t('form:input-title')}
                variant="outline"
                {...register('settings.category.title')}
                error={t(errors?.settings?.category?.title?.message)}
                required
              />
              <Input
                label={t('form:input-description')}
                variant="outline"
                {...register('settings.category.description')}
                error={t(errors?.settings?.category?.description?.message)}
              />
            </>
          ) : (
            ''
          )}
          {/* Trending Products */}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.trendingProducts.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.trendingProducts.enable"
            >
              Enable Trending Products?
            </Label>
          </div>
          {trendingProductsEnable ? (
            <>
              <Input
                label={t('form:input-title')}
                variant="outline"
                {...register('settings.trendingProducts.title')}
                error={t(errors?.settings?.trendingProducts?.title?.message)}
                required
              />
              <Input
                label={t('form:input-description')}
                variant="outline"
                {...register('settings.trendingProducts.description')}
                error={t(
                  errors?.settings?.trendingProducts?.description?.message,
                )}
              />
              <div>
                <Label className="mb-2">{t('text-banner')}</Label>
                <p className="text-xs text-amber-600">
                  *{t('form:banner-helper-save-data')}
                </p>
                <p className="text-xs text-amber-600">
                  *{t('form:banner-helper-single-section')}
                </p>
                <p className="text-xs mb-4 text-amber-600">
                  *{t('form:banner-helper-first-item-appear')}
                </p>
                {!isEmpty(trendingProductsBannerData?.content) ? (
                  isArray(trendingProductsBannerData?.content) &&
                  trendingProductsBannerData?.content?.map((item, index) => {
                    let modifiedData: typeof trendingProductsBannerData = {
                      ...trendingProductsBannerData,
                      zones: { ...trendingProductsBannerData?.zones },
                      content: [item],
                    };
                    return (
                      <Card
                        key={index}
                        className="relative w-full group overflow-hidden"
                      >
                        {Boolean(
                          trendingProductsBannerData?.root?.props?.display,
                        ) ? (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full w-full"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(125deg,rgba(0,0,0,.05),rgba(0,0,0,.05) 1px,transparent 2px,transparent 9px)',
                              }}
                            />
                            <div
                              style={{
                                filter: 'opacity(.4) saturate(0)',
                              }}
                            >
                              <Render
                                config={GroupConfig as PuckConfig}
                                data={modifiedData}
                              />
                            </div>
                          </>
                        ) : index === 0 ? (
                          <Render
                            config={GroupConfig as PuckConfig}
                            data={modifiedData}
                          />
                        ) : (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full w-full"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(125deg,rgba(0,0,0,.05),rgba(0,0,0,.05) 1px,transparent 2px,transparent 9px)',
                              }}
                            />
                            <div
                              style={{
                                filter: 'opacity(.4) saturate(0)',
                              }}
                            >
                              <Render
                                config={GroupConfig as PuckConfig}
                                data={modifiedData}
                              />
                            </div>
                          </>
                        )}
                        <Link
                          href={
                            router?.query?.action === 'edit'
                              ? `/${Routes.type.edit(groupName, locale!)}/builder?id=${item?.props?.id}&section=trendingProducts&layoutType=${layoutType}`
                              : `/${Routes.type.translate(groupName, locale!)}/builder?id=${item?.props?.id}&section=trendingProducts&layoutType=${layoutType}`
                          }
                          className="absolute z-20 inline-flex items-center justify-center flex-shrink-0 gap-1 p-2 text-xs font-semibold leading-none transition duration-300 ease-in-out border border-transparent rounded outline-none opacity-0 focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 right-1 top-1 group-hover:opacity-100"
                          onClick={() => setData(data)}
                        >
                          <PencilIcon height="1em" width="1em" />{' '}
                          {t('form:item-description-edit')}
                        </Link>
                      </Card>
                    );
                  })
                ) : (
                  <Link
                    href={
                      initialValues
                        ? router?.query?.action === 'edit'
                          ? `/${Routes.type.edit(groupName, locale!)}/builder?section=trendingProducts&layoutType=${layoutType}`
                          : `/${Routes.type.translate(groupName, locale!)}/builder?section=trendingProducts&layoutType=${layoutType}`
                        : `${Routes.type.create}/builder?section=trendingProducts&layoutType=${layoutType}`
                    }
                    className="inline-flex items-center justify-center flex-shrink-0 h-10 px-5 py-0 text-sm font-semibold transition duration-300 ease-in-out border border-transparent rounded outline-none focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 me-4"
                    onClick={addSectionOnClickHandler}
                  >
                    {t('form:button-label-create-banner')}
                  </Link>
                )}
              </div>
            </>
          ) : (
            ''
          )}
          {/* Featured Brands */}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.featuredBrands.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.featuredBrands.enable"
            >
              Enable Featured Brands?
            </Label>
          </div>{' '}
          {featuredBrandsEnable ? (
            <>
              <Input
                label={t('form:input-title')}
                variant="outline"
                {...register('settings.featuredBrands.title')}
                error={t(errors?.settings?.featuredBrands?.title?.message)}
                required
              />
              <Input
                label={t('form:input-description')}
                variant="outline"
                {...register('settings.featuredBrands.description')}
                error={t(
                  errors?.settings?.featuredBrands?.description?.message,
                )}
              />
            </>
          ) : (
            ''
          )}
          {/* Latest Shoes */}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.latestProducts.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.latestProducts.enable"
            >
              Enable Latest Products?
            </Label>
          </div>
          {latestProductsEnable ? (
            <>
              <Input
                label={t('form:input-title')}
                variant="outline"
                {...register('settings.latestProducts.title')}
                error={t(errors?.settings?.latestProducts?.title?.message)}
                required
              />
              <Input
                label={t('form:input-description')}
                variant="outline"
                {...register('settings.latestProducts.description')}
                error={t(
                  errors?.settings?.latestProducts?.description?.message,
                )}
              />
              <div>
                <Label className="mb-2">{t('text-banner')}</Label>
                <p className="text-xs text-amber-600">
                  *{t('form:banner-helper-save-data')}
                </p>
                <p className="text-xs text-amber-600">
                  *{t('form:banner-helper-single-section')}
                </p>
                <p className="text-xs mb-4 text-amber-600">
                  *{t('form:banner-helper-first-item-appear')}
                </p>
                {!isEmpty(latestProductsBannerData?.content) ? (
                  isArray(latestProductsBannerData?.content) &&
                  latestProductsBannerData?.content?.map((item, index) => {
                    let modifiedData: typeof latestProductsBannerData = {
                      ...latestProductsBannerData,
                      zones: { ...latestProductsBannerData?.zones },
                      content: [item],
                    };

                    return (
                      <Card
                        key={index}
                        className="relative w-full group overflow-hidden"
                      >
                        {Boolean(
                          latestProductsBannerData?.root?.props?.display,
                        ) ? (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full w-full"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(125deg,rgba(0,0,0,.05),rgba(0,0,0,.05) 1px,transparent 2px,transparent 9px)',
                              }}
                            />
                            <div
                              style={{
                                filter: 'opacity(.4) saturate(0)',
                              }}
                            >
                              <Render
                                config={GroupConfig as PuckConfig}
                                data={modifiedData}
                              />
                            </div>
                          </>
                        ) : index === 0 ? (
                          <Render
                            config={GroupConfig as PuckConfig}
                            data={modifiedData}
                          />
                        ) : (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full w-full"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(125deg,rgba(0,0,0,.05),rgba(0,0,0,.05) 1px,transparent 2px,transparent 9px)',
                              }}
                            />
                            <div
                              style={{
                                filter: 'opacity(.4) saturate(0)',
                              }}
                            >
                              <Render
                                config={GroupConfig as PuckConfig}
                                data={modifiedData}
                              />
                            </div>
                          </>
                        )}
                        <Link
                          href={
                            router?.query?.action === 'edit'
                              ? `/${Routes.type.edit(groupName, locale!)}/builder?id=${item?.props?.id}&section=latestProducts&layoutType=${layoutType}`
                              : `/${Routes.type.translate(groupName, locale!)}/builder?id=${item?.props?.id}&section=latestProducts&layoutType=${layoutType}`
                          }
                          className="absolute z-20 inline-flex items-center justify-center flex-shrink-0 gap-1 p-2 text-xs font-semibold leading-none transition duration-300 ease-in-out border border-transparent rounded outline-none opacity-0 focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 right-1 top-1 group-hover:opacity-100"
                          onClick={() => setData(data)}
                        >
                          <PencilIcon height="1em" width="1em" />{' '}
                          {t('form:item-description-edit')}
                        </Link>
                      </Card>
                    );
                  })
                ) : (
                  <Link
                    href={
                      initialValues
                        ? router?.query?.action === 'edit'
                          ? `/${Routes.type.edit(groupName, locale!)}/builder?section=latestProducts&layoutType=${layoutType}`
                          : `/${Routes.type.translate(groupName, locale!)}/builder?section=latestProducts&layoutType=${layoutType}`
                        : `${Routes.type.create}/builder?section=latestProducts&layoutType=${layoutType}`
                    }
                    className="inline-flex items-center justify-center flex-shrink-0 h-10 px-5 py-0 text-sm font-semibold transition duration-300 ease-in-out border border-transparent rounded outline-none focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 me-4"
                    onClick={addSectionOnClickHandler}
                  >
                    {t('form:button-label-create-banner')}
                  </Link>
                )}
              </div>
            </>
          ) : (
            ''
          )}
        </div>
      </Card>
    </div>
  );
}
