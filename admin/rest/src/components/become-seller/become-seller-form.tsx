import { becomeSellerValidationSchema } from '@/components/become-seller/become-seller-form-validation-schema';
import { Banner } from '@/components/become-seller/form-part/banner';
import { BusinessPurpose } from '@/components/become-seller/form-part/business-purpose';
import { Commission } from '@/components/become-seller/form-part/commission';
import { FAQ } from '@/components/become-seller/form-part/faq';
import { StartSelling } from '@/components/become-seller/form-part/start-selling';
import { updatedIcons } from '@/components/become-seller/updated-icon';
import { ArrowUp } from '@/components/icons/arrow-up';
import { BackToTopButton } from '@/components/ui/back-to-top/back-to-top';
import { useBackToTop } from '@/components/ui/back-to-top/back-to-top-context';
import Button from '@/components/ui/button';
import StickyFooterPanel from '@/components/ui/sticky-footer-panel';
// import {
//   becomeSellerBuilder,
//   becomeSellerSortingItems,
// } from '@/contexts/builder';
import { useUpdateBecomeSellerMutation } from '@/data/become-seller';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { BecomeSeller, BecomeSellerInput, Settings } from '@/types';
import { useConfirmRedirectIfDirty } from '@/utils/confirmed-redirect-if-dirty';
// import { BECOME_A_SELLER_PRAMS } from '@/utils/constants';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
// import { useRecoilState } from 'recoil';
import { Contact } from './form-part/contact';
import { DashboardShowcase } from './form-part/dashboard-showcase';
import { Guideline } from './form-part/guideline';
import { SellerOpportunity } from './form-part/seller-opportunity';
import { UserStory } from './form-part/user-story';

type IProps = {
  becomeSellerData?: BecomeSeller | null;
  settings?: Settings | null;
};

export default function BecomeSellerInfoForm({
  becomeSellerData,
  settings,
}: IProps) {
  const { t } = useTranslation();
  const { locale, reload } = useRouter();
  const { mutate: updateBecomeSellerMutation, isLoading: loading } =
    useUpdateBecomeSellerMutation();
  const { page_options, commissions } = becomeSellerData ?? {};

  const { options } = settings ?? {};
  const max_fileSize = options?.server_info?.upload_max_filesize! * 1024;
  const queryClient = useQueryClient();

  // const becomeSellerLocalData = becomeSellerBuilder(BECOME_A_SELLER_PRAMS);
  // const becomeSellerLocalSortData = becomeSellerSortingItems(
  //   BECOME_A_SELLER_PRAMS,
  // );

  // const [data, setData] = useRecoilState(becomeSellerLocalData);
  // const [sellYourGear, setSellYourGearItems] = useRecoilState(
  //   becomeSellerLocalSortData,
  // );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm<BecomeSellerInput>({
    shouldUnregister: true,
    // @ts-ignore
    resolver: yupResolver(becomeSellerValidationSchema),
    ...(becomeSellerData
      ? {
          defaultValues: {
            page_options: {
              ...page_options?.page_options,
              purposeItems: page_options?.page_options?.purposeItems
                ? page_options?.page_options?.purposeItems?.map((item) => ({
                    description: item?.description,
                    title: item?.title,
                    icon: updatedIcons?.find(
                      (icon) => icon?.value === item?.icon?.value,
                    ),
                  }))
                : [],
            },
            commissions,
          },
        }
      : {}),
  });

  async function onSubmit(values: BecomeSellerInput) {
    // TODO: After Discussion
    // const builderContent = data?.content?.reduce((acc, item) => {
    //   if (item?.props?.id) {
    //     acc[item?.props?.id] = { ...item };
    //   }
    //   return acc;
    // }, {});

    // const builderData = {
    //   builder: {
    //     data: {
    //       content: {
    //         ...data?.content,
    //       },
    //       zones: {
    //         ...data?.zones,
    //       },
    //     },
    //   },
    // };

    updateBecomeSellerMutation(
      {
        language: locale,
        ...values,
        page_options: {
          ...values.page_options,
          purposeItems: values?.page_options?.purposeItems?.map((item) => ({
            description: item?.description,
            title: item?.title,
            icon: {
              value: item?.icon?.value,
            },
          })),
          // TODO: After Discussion
          // items: { ...sellYourGear },
          // ...builderContent,
          // ...builderData,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries([
            API_ENDPOINTS.BECAME_SELLER,
            { language: locale },
          ]);
        },
      },
    );
  }

  const isDirty = Object.keys(dirtyFields).length > 0;
  useConfirmRedirectIfDirty({ isDirty });

  const { refs } = useBackToTop();

  // TODO: After Discussion
  // const addSectionOnClickHandler = () => {
  //   setData(data);
  //   setSellYourGearItems(sellYourGear);
  // };

  useEffect(() => {
    setValue(
      'page_options.isMultiCommissionRate',
      Boolean(options?.isMultiCommissionRate),
    );
  }, [options?.isMultiCommissionRate]);

  // TODO: After Discussion
  // useEffect(() => {
  //   if (
  //     data &&
  //     isEmpty(data) &&
  //     becomeSellerData?.page_options?.page_options?.builder?.data
  //   ) {
  //     setData(becomeSellerData?.page_options?.page_options?.builder?.data);
  //   }
  //   if (becomeSellerData?.page_options?.page_options?.items) {
  //     if (isEmpty(sellYourGear))
  //       setSellYourGearItems(
  //         becomeSellerData?.page_options?.page_options?.items,
  //       );
  //   } else {
  //     if (isEmpty(sellYourGear))
  //       setSellYourGearItems(
  //         modifiedSortingItems({
  //           items: defaultKeys,
  //         }),
  //       );
  //   }
  // }, []);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* TODO: After Discussion */}
        {/* {!isEmpty(sellYourGear) && sellYourGear ? (
          <div className="flex flex-wrap items-start pb-8 my-5 border-b border-dashed sm:my-5 border-border-base">
            <Description
              title="Rearrange Page Sections"
              details="Set your page sections from here"
              className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
            />

            <Card className="w-full p-0 sm:w-8/12 md:w-2/3 md:p-0">
              <SortableList
                items={sellYourGear}
                onChange={setSellYourGearItems}
                renderItem={(item) => {
                  const widgetTitle = data?.content?.find(
                    (data) => data?.props?.id === item?.id,
                  )?.props?.widgetTitle;
                  return (
                    <SortableList.Item id={item?.id}>
                      <span
                        onClick={() => scrollToSection({ id: item?.id })}
                        className="cursor-pointer"
                      >
                        {defaultKeys?.includes(item?.id)
                          ? defaultKeysTitle?.[item?.id]
                          : widgetTitle
                            ? widgetTitle
                            : item?.id}
                      </span>
                      <SortableList.DragHandle />
                    </SortableList.Item>
                  );
                }}
              />
            </Card>
          </div>
        ) : (
          ''
        )} */}

        <Banner
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
        />

        <StartSelling
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
          watch={watch}
        />

        <UserStory
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
          watch={watch}
        />

        <BusinessPurpose
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          purposeItems={page_options?.page_options?.purposeItems}
        />

        <Commission
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
          watch={watch}
          isMultiCommissionRate={options?.isMultiCommissionRate}
          commissions={commissions}
        />

        <DashboardShowcase
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
        />

        <Guideline
          register={register}
          control={control}
          errors={errors}
          watch={watch}
        />

        <FAQ
          register={register}
          control={control}
          errors={errors}
          watch={watch}
        />

        <Contact register={register} errors={errors} control={control} />

        <SellerOpportunity
          register={register}
          control={control}
          errors={errors}
          max_fileSize={max_fileSize}
        />
        {/* TODO: After Discussion */}
        {/* {!isEmpty(data?.content) && isArray(data?.content)
          ? data?.content?.map((item, index) => {
              let modifiedData: typeof data = {
                ...data,
                zones: { ...data?.zones },
                content: [item],
              };
              return (
                <div
                  className="flex flex-wrap pb-8 my-5 border-b border-dashed border-border-base sm:my-8 relative"
                  id={item?.props?.id}
                  key={index}
                >
                  <Description
                    title={
                      item?.props?.widgetTitle
                        ? item?.props?.widgetTitle
                        : item?.type?.toString()
                    }
                    details={''}
                    className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
                  />

                  <Card className="relative w-full p-0 sm:w-8/12 md:w-2/3 md:p-0 group overflow-hidden">
                    {Boolean(item?.props?.display) ? (
                      <>
                        <div
                          className="absolute top-0 left-0 h-full w-full"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(125deg,rgba(0,0,0,.05),rgba(0,0,0,.05) 1px,transparent 2px,transparent 9px)',
                          }}
                        />
                        <div style={{ filter: 'opacity(.4) saturate(0)' }}>
                          <Render
                            config={BecomeSellerConfig as Config}
                            data={modifiedData}
                          />
                        </div>
                      </>
                    ) : (
                      <Render
                        config={BecomeSellerConfig as Config}
                        data={modifiedData}
                      />
                    )}
                    <Link
                      href={`${Routes.becomeSeller}/builder?id=${item?.props?.id}`}
                      className="absolute z-20 inline-flex items-center justify-center flex-shrink-0 gap-1 p-2 text-xs font-semibold leading-none transition duration-300 ease-in-out border border-transparent rounded outline-none opacity-0 focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 right-1 top-1 group-hover:opacity-100"
                      onClick={() => setData(data)}
                    >
                      <PencilIcon height="1em" width="1em" /> Edit
                    </Link>
                  </Card>
                </div>
              );
            })
          : ''} */}

        <StickyFooterPanel className="z-0">
          {/* TODO: After Discussion */}
          {/* <Link
            href={`${Routes.becomeSeller}/builder`}
            className="inline-flex items-center justify-center flex-shrink-0 h-12 px-5 py-0 text-sm font-semibold transition duration-300 ease-in-out border border-transparent rounded outline-none focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 md:text-base me-4"
            onClick={addSectionOnClickHandler}
            ref={refs.setReference}
          >
            Add Section
          </Link> */}
          <Button
            loading={loading}
            disabled={loading}
            className="text-sm md:text-base"
            ref={refs.setReference}
          >
            {t('form:text-save-seller-information')}
          </Button>
        </StickyFooterPanel>
      </form>
      <BackToTopButton asChild className="shadow-md" parentClass="!z-30">
        <Button className="text-sm md:text-base">
          <ArrowUp />
        </Button>
      </BackToTopButton>
    </>
  );
}
