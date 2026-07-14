import {
  classicKeys,
  combinedKeys,
  commonKeys,
  compactKeys,
  elegantKeys,
  layoutTypes,
  productCards,
} from '@/components/group/constant';
import { typeIconList } from '@/components/group/group-icons';
import { typeValidationSchema } from '@/components/group/group-validation-schema';
import Button from '@/components/ui/button';
import StickyFooterPanel from '@/components/ui/sticky-footer-panel';
import { Config } from '@/config';
import { Routes } from '@/config/routes';
import {
  BaseItem,
  groupsBuilder,
  groupsSortingItems,
  modifiedSortingItems,
  sectionBannerBuilder,
} from '@/contexts/builder';
import { useFlashSalesQuery } from '@/data/flash-sale';
import { useProductsQuery } from '@/data/product';
import { useCreateTypeMutation, useUpdateTypeMutation } from '@/data/type';
import { useConfirmRedirectIfDirty } from '@/utils/confirmed-redirect-if-dirty';
import { formatSlug } from '@/utils/use-slug';
import { UniqueIdentifier } from '@dnd-kit/core';
import { yupResolver } from '@hookform/resolvers/yup';
import { isEmpty } from 'lodash';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useRecoilState } from 'recoil';
import BannerFormPart from '@/components/group/form-parts/banner';
import BuilderFormParts from '@/components/group/form-parts/builder';
import CommonFormPart from '@/components/group/form-parts/common';
import CompactFormPart from '@/components/group/form-parts/compact';
import ElegantFormPart from '@/components/group/form-parts/elegant';
import PromotionalSliderFormPart from '@/components/group/form-parts/promotional-slider';
import RearrangeFormPart from '@/components/group/form-parts/rearrange';
import { CommonProps, FormValues } from '@/components/group/form-parts/type';
import { FlashSale } from '@/types';

export default function CreateOrUpdateTypeForm({
  initialValues,
  loadingFlashSales,
  flashSale,
}: Pick<CommonProps, 'initialValues'> & {
  flashSale: FlashSale[];
  loadingFlashSales: boolean;
}) {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation();
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [isSlugDisable, setIsSlugDisable] = useState<boolean>(true);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields, isDirty },
    reset,
  } = useForm<FormValues>({
    shouldUnregister: true,
    //@ts-ignore
    resolver: yupResolver(typeValidationSchema),
    defaultValues: {
      ...initialValues,
      // @ts-ignore
      settings: {
        ...initialValues?.settings,
        layoutType: initialValues?.settings?.layoutType
          ? initialValues?.settings?.layoutType
          : layoutTypes[0].value,
        productCard: initialValues?.settings?.productCard
          ? initialValues?.settings?.productCard
          : productCards[0].value,
        bestSelling: {
          enable: initialValues?.settings?.bestSelling?.enable,
          title: initialValues?.settings?.bestSelling?.title,
        },
        popularProducts: {
          enable: initialValues?.settings?.popularProducts?.enable,
          title: initialValues?.settings?.popularProducts?.title,
        },
        category: {
          enable: initialValues?.settings?.category?.enable,
          title: initialValues?.settings?.category?.title,
          description: initialValues?.settings?.category?.description,
        },
        handpickedProducts: {
          enable: initialValues?.settings?.handpickedProducts?.enable,
          enableSlider:
            initialValues?.settings?.handpickedProducts?.enableSlider,
          title: initialValues?.settings?.handpickedProducts?.title,
          products: initialValues?.settings?.handpickedProducts?.products
            ? initialValues?.settings?.handpickedProducts?.products?.map(
                (product: any) => product,
              )
            : [],
        },
        newArrival: {
          enable: initialValues?.settings?.newArrival?.enable,
          title: initialValues?.settings?.newArrival?.title,
        },
        authors: {
          enable: initialValues?.settings?.authors?.enable,
          title: initialValues?.settings?.authors?.title,
        },
        manufactures: {
          enable: initialValues?.settings?.manufactures?.enable,
          title: initialValues?.settings?.manufactures?.title,
        },
        flashSales: {
          enable: initialValues?.settings?.flashSales?.enable,
          campaign: flashSale?.find(
            (item) =>
              item?.slug === initialValues?.settings?.flashSales?.campaign,
          ),
        },
        trendingProducts: {
          enable: initialValues?.settings?.trendingProducts?.enable,
          title: initialValues?.settings?.trendingProducts?.title,
          description: initialValues?.settings?.trendingProducts?.description,
          banner: initialValues?.settings?.trendingProducts?.banner ?? {},
        },
        featuredBrands: {
          enable: initialValues?.settings?.featuredBrands?.enable,
          title: initialValues?.settings?.featuredBrands?.title,
          description: initialValues?.settings?.featuredBrands?.description,
        },
        latestProducts: {
          enable: initialValues?.settings?.latestProducts?.enable,
          title: initialValues?.settings?.latestProducts?.title,
          description: initialValues?.settings?.latestProducts?.description,
          banner: initialValues?.settings?.latestProducts?.banner ?? {},
        },
        // featuredShops: {
        //   enable: initialValues?.settings?.featuredShops?.enable,
        //   title: initialValues?.settings?.featuredShops?.title,
        //   description: initialValues?.settings?.featuredShops?.description,
        // },
      },
      icon: initialValues?.icon
        ? typeIconList.find(
            (singleIcon) => singleIcon.value === initialValues?.icon,
          )
        : '',
    },
  });

  const watchSlug = useWatch({
    control,
    name: 'slug',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'banners',
  });

  const layoutType = useWatch({
    control,
    name: 'settings.layoutType',
  });
  const bestSellingEnable = useWatch({
    control,
    name: 'settings.bestSelling.enable',
  });
  const popularProductsEnable = useWatch({
    control,
    name: 'settings.popularProducts.enable',
  });
  const categoryEnable = useWatch({
    control,
    name: 'settings.category.enable',
  });
  const handpickedProductsEnable = useWatch({
    control,
    name: 'settings.handpickedProducts.enable',
  });
  const newArrivalEnable = useWatch({
    control,
    name: 'settings.newArrival.enable',
  });
  const authorsEnable = useWatch({
    control,
    name: 'settings.authors.enable',
  });
  const manufacturesEnable = useWatch({
    control,
    name: 'settings.manufactures.enable',
  });

  const flashSalesEnable = useWatch({
    control,
    name: 'settings.flashSales.enable',
  });

  const trendingProductsEnable = useWatch({
    control,
    name: 'settings.trendingProducts.enable',
  });

  const featuredBrandsEnable = useWatch({
    control,
    name: 'settings.featuredBrands.enable',
  });

  const latestProductsEnable = useWatch({
    control,
    name: 'settings.latestProducts.enable',
  });

  // const featuredShopsEnable = useWatch({
  //   control,
  //   name: 'settings.featuredShops.enable',
  // });

  const groupName = Array.isArray(router.query.groupSlug)
    ? router.query.groupSlug[0]
    : (router.query.groupSlug ?? watchSlug ?? '');

  const groupNameWithLocale = `${groupName}-${layoutType}-${locale}`;

  const groupsLocalData = groupsBuilder(groupNameWithLocale);
  const groupsLocalSortData = groupsSortingItems(groupNameWithLocale);

  const trendingProductsBannerLocalData = sectionBannerBuilder(
    `${groupNameWithLocale}-trendingProducts`,
  );

  const latestProductsBannerLocalData = sectionBannerBuilder(
    `${groupNameWithLocale}-latestProducts`,
  );

  const [data, setData] = useRecoilState(groupsLocalData);
  const [groupItems, setGroupsItems] = useRecoilState(groupsLocalSortData);

  const [trendingProductsBannerData, setTrendingProductsBannerData] =
    useRecoilState(trendingProductsBannerLocalData);
  const [latestProductsBannerData, setLatestProductsBannerData] =
    useRecoilState(latestProductsBannerLocalData);

  const isSlugEditable =
    router?.query?.action === 'edit' &&
    router?.locale === Config.defaultLanguage;

  const { mutate: createType, isLoading: creating } = useCreateTypeMutation();
  const { mutate: updateType, isLoading: updating } = useUpdateTypeMutation();
  const slugAutoSuggest = formatSlug(watch('name'));

  const onSubmit = (values: FormValues) => {
    const builderContent = data?.content?.reduce(
      (acc: { [key: string]: any }, item) => {
        if (item?.props?.id) {
          acc[item?.props?.id] = { ...item };
        }
        return acc;
      },
      {},
    );

    const builderData = {
      builder: {
        data: {
          content: {
            ...data?.content,
          },
          zones: {
            ...data?.zones,
          },
        },
      },
    };

    const input = {
      language: router.locale,
      name: values.name!,
      slug: values.slug!,
      icon: values.icon?.value,
      settings: {
        isHome: values?.settings?.isHome,
        productCard: values?.settings?.productCard,
        layoutType: values?.settings?.layoutType,
        bestSelling: {
          enable: values?.settings?.bestSelling?.enable,
          title: values?.settings?.bestSelling?.title,
        },
        popularProducts: {
          enable: values?.settings?.popularProducts?.enable,
          title: values?.settings?.popularProducts?.title,
        },
        category: {
          enable: values?.settings?.category?.enable,
          title: values?.settings?.category?.title,
          description: values?.settings?.category?.description,
        },
        handpickedProducts: {
          enable: values?.settings?.handpickedProducts?.enable,
          enableSlider: values?.settings?.handpickedProducts?.enableSlider,
          title: values?.settings?.handpickedProducts?.title,
          products: values?.settings?.handpickedProducts?.products?.map(
            (product: any) => {
              return {
                id: product?.id!,
                name: product?.name,
                slug: product?.slug,
                regular_price: product?.regular_price,
                sale_price: product?.sale_price,
                min_price: product?.min_price,
                max_price: product?.max_price,
                product_type: product?.product_type,
                quantity: product?.quantity,
                is_external: product?.is_external,
                unit: product?.unit,
                price: product?.price,
                external_product_url: product?.external_product_url,
                status: product?.status,
                image: {
                  id: product?.image?.id,
                  thumbnail: product?.image?.thumbnail,
                  original: product?.image?.original,
                },
                type: {
                  settings: {
                    productCard: values?.settings?.productCard,
                  },
                },
              };
            },
          ),
        },
        newArrival: {
          enable: values?.settings?.newArrival?.enable,
          title: values?.settings?.newArrival?.title,
        },
        authors: {
          enable: values?.settings?.authors?.enable,
          title: values?.settings?.authors?.title,
        },
        manufactures: {
          enable: values?.settings?.manufactures?.enable,
          title: values?.settings?.manufactures?.title,
        },
        flashSales: {
          enable: values?.settings?.flashSales?.enable,
          campaign: values?.settings?.flashSales?.campaign?.slug,
        },
        trendingProducts: {
          enable: values?.settings?.trendingProducts?.enable,
          title: values?.settings?.trendingProducts?.title,
          description: values?.settings?.trendingProducts?.description,
          banner: trendingProductsBannerData,
        },
        featuredBrands: {
          enable: values?.settings?.featuredBrands?.enable,
          title: values?.settings?.featuredBrands?.title,
          description: values?.settings?.featuredBrands?.description,
        },
        latestProducts: {
          enable: values?.settings?.latestProducts?.enable,
          title: values?.settings?.latestProducts?.title,
          description: values?.settings?.latestProducts?.description,
          banner: latestProductsBannerData,
        },
        // featuredShops: {
        //   enable: values?.settings?.featuredShops?.enable,
        //   title: values?.settings?.featuredShops?.title,
        //   description: values?.settings?.featuredShops?.description,
        // },

        builder: {
          items: { ...groupItems },
          ...builderContent,
          ...builderData,
        },
        action: router?.query?.action,
      },
      promotional_sliders: values.promotional_sliders?.map(
        ({ thumbnail, original, id }: any) => ({
          thumbnail,
          original,
          id,
        }),
      ),
      banners: values?.banners?.map((banner) => ({
        ...banner,
        image: {
          id: banner?.image?.id,
          thumbnail: banner?.image?.thumbnail,
          original: banner?.image?.original,
        },
      })),
    };

    if (
      !initialValues ||
      !initialValues.translated_languages.includes(router.locale!)
    ) {
      createType({
        ...input,
        ...(initialValues?.slug && { slug: initialValues.slug }),
      });
    } else {
      updateType({
        ...input,
        id: initialValues.id!,
      });
    }
    reset(values, { keepValues: true });
  };

  const { products, loading: loadingProduct } = useProductsQuery({
    limit: 999,
    language: router?.locale,
    type,
    categories: category,
    status: 'publish',
  });

  const dynamicKeys =
    layoutType === 'compact'
      ? compactKeys
      : layoutType === 'classic'
        ? classicKeys
        : layoutType === 'elegant'
          ? elegantKeys
          : commonKeys;

  const initialBuilderItems = initialValues?.settings?.builder?.items;

  const addSectionOnClickHandler = () => {
    setData(data);
    setGroupsItems(groupItems);
    setTrendingProductsBannerData(trendingProductsBannerData);
    setLatestProductsBannerData(latestProductsBannerData);
  };

  const setGroupItemsHandler = (
    dynamicKeys: UniqueIdentifier[],
    groupItems: any,
  ) => {
    let existingKeys = groupItems?.map((item: BaseItem) => item?.id);
    let builderKeys = existingKeys?.filter(
      (item: any) => !combinedKeys?.includes(item),
    );
    return setGroupsItems(
      modifiedSortingItems({
        items: Array.from(new Set([...dynamicKeys, ...builderKeys])),
      }),
    );
  };

  useEffect(() => {
    const initialBuilderData = initialValues?.settings?.builder?.builder?.data;
    const initialTrendingProductsBannerData =
      initialValues?.settings?.trendingProducts?.banner;
    const initialValuesLatestProductsBannerData =
      initialValues?.settings?.latestProducts?.banner;

    if (data && isEmpty(data) && initialBuilderData) {
      setData(initialBuilderData);
    }

    if (
      isEmpty(trendingProductsBannerData) &&
      initialTrendingProductsBannerData
    ) {
      setTrendingProductsBannerData(initialTrendingProductsBannerData);
    }
    if (
      isEmpty(latestProductsBannerData) &&
      initialValuesLatestProductsBannerData
    ) {
      setLatestProductsBannerData(initialValuesLatestProductsBannerData);
    }

    if (initialBuilderItems && isEmpty(groupItems)) {
      return setGroupsItems(initialBuilderItems);
    }

    if (!initialBuilderItems && isEmpty(groupItems)) {
      return setGroupsItems(
        modifiedSortingItems({
          items: dynamicKeys,
        }),
      );
    }

    if (
      !initialBuilderItems &&
      !isEmpty(groupItems) &&
      dirtyFields?.settings?.layoutType
    ) {
      setGroupItemsHandler(dynamicKeys, groupItems);
    }

    if (
      initialBuilderItems &&
      !isEmpty(groupItems) &&
      dirtyFields?.settings?.layoutType
    ) {
      setGroupItemsHandler(dynamicKeys, groupItems);
    }

    // if (
    //   initialBuilderItems &&
    //   !isEmpty(groupItems) &&
    //   !dirtyFields?.settings?.layoutType
    // ) {
    //   setGroupItemsHandler(dynamicKeys, groupItems);
    // }
  }, [layoutType, dirtyFields?.settings?.layoutType]);

  // Confirm navigate if edited data not saved
  useConfirmRedirectIfDirty({
    isDirty,
    excludeMatchPath: [
      `/groups/${groupName}/edit`,
      `/groups/${groupName}/edit/builder`,
      `/groups/create/builder&layoutType=${layoutType}`,
    ],
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <RearrangeFormPart
        groupItems={groupItems}
        data={data}
        setGroupsItems={setGroupsItems}
      />

      <CommonFormPart
        initialValues={initialValues}
        control={control}
        errors={errors}
        register={register}
        isSlugEditable={isSlugEditable}
        isSlugDisable={isSlugDisable}
        setIsSlugDisable={setIsSlugDisable}
        slugAutoSuggest={slugAutoSuggest}
      />

      {layoutType === 'classic' ? (
        <PromotionalSliderFormPart control={control} />
      ) : null}

      {layoutType !== 'elegant' && (
        <BannerFormPart
          control={control}
          register={register}
          errors={errors}
          layoutType={layoutType}
          fields={fields}
          remove={remove}
        />
      )}

      {layoutType === 'compact' ? (
        <CompactFormPart
          control={control}
          register={register}
          errors={errors}
          bestSellingEnable={bestSellingEnable}
          popularProductsEnable={popularProductsEnable}
          categoryEnable={categoryEnable}
          handpickedProductsEnable={handpickedProductsEnable}
          type={type}
          setCategory={setCategory}
          setType={setType}
          products={products}
          loadingProduct={loadingProduct}
          newArrivalEnable={newArrivalEnable}
          authorsEnable={authorsEnable}
          manufacturesEnable={manufacturesEnable}
        />
      ) : (
        ''
      )}

      {layoutType === 'elegant' && (
        <ElegantFormPart
          initialValues={initialValues}
          control={control}
          register={register}
          errors={errors}
          flashSalesEnable={flashSalesEnable}
          flashSale={flashSale}
          loadingFlashSales={loadingFlashSales}
          categoryEnable={categoryEnable}
          trendingProductsEnable={trendingProductsEnable}
          trendingProductsBannerData={trendingProductsBannerData}
          groupName={groupName}
          setTrendingProductsBannerData={setTrendingProductsBannerData}
          addSectionOnClickHandler={addSectionOnClickHandler}
          featuredBrandsEnable={featuredBrandsEnable}
          latestProductsEnable={latestProductsEnable}
          latestProductsBannerData={latestProductsBannerData}
          setLatestProductsBannerData={setLatestProductsBannerData}
          setData={setData}
          data={data}
          layoutType={layoutType}
        />
      )}

      <BuilderFormParts
        data={data}
        groupName={groupName}
        layoutType={layoutType}
        setGroupItemsHandler={setGroupItemsHandler}
        dynamicKeys={dynamicKeys}
        groupItems={groupItems}
        setGroupsItems={setGroupsItems}
        setData={setData}
      />
      <StickyFooterPanel className="z-[10]">
        <div className="text-end">
          {initialValues && (
            <Button
              variant="outline"
              onClick={router.back}
              className="text-sm me-4 md:text-base"
              type="button"
            >
              {t('form:button-label-back')}
            </Button>
          )}
          <Link
            href={
              initialValues
                ? router?.query?.action === 'edit'
                  ? `/${Routes.type.edit(groupName, locale!)}/builder?layoutType=${layoutType}`
                  : `/${Routes.type.translate(groupName, locale!)}/builder?layoutType=${layoutType}`
                : `${Routes.type.create}/builder?layoutType=${layoutType}`
            }
            className="inline-flex items-center justify-center flex-shrink-0 h-12 px-5 py-0 text-sm font-semibold transition duration-300 ease-in-out border border-transparent rounded outline-none focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 md:text-base me-4"
            onClick={addSectionOnClickHandler}
          >
            {t('common:text-add-section')}
          </Link>
          <Button
            loading={creating || updating}
            disabled={creating || updating}
            className="text-sm md:text-base"
          >
            {initialValues
              ? t('form:button-label-update-group')
              : t('form:button-label-add-group')}
          </Button>
        </div>
      </StickyFooterPanel>
    </form>
  );
}
