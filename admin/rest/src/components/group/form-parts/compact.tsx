import Card from '@/components/common/card';
import CategoryTypeFilter from '@/components/filters/category-type-filter';
import Description from '@/components/ui/description';
import ValidationError from '@/components/ui/form-validation-error';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import SelectInput from '@/components/ui/select-input';
import SwitchInput from '@/components/ui/switch-input';
import { Category, Type } from '@/types';
import { useTranslation } from 'next-i18next';
import { CompactFormPartProps } from '@/components/group/form-parts/type';
import { cn } from '@/lib/utils';
import { twMerge } from 'tailwind-merge';

export default function CompactFormPart({
  control,
  register,
  errors,
  bestSellingEnable,
  popularProductsEnable,
  categoryEnable,
  handpickedProductsEnable,
  type,
  setCategory,
  setType,
  products,
  loadingProduct,
  newArrivalEnable,
  authorsEnable,
  manufacturesEnable,
  className,
  ...props
}: CompactFormPartProps) {
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
          <div className="flex items-center gap-x-4">
            <SwitchInput name="settings.bestSelling.enable" control={control} />
            <Label
              htmlFor="settings.bestSelling.enable"
              className="mb-0 cursor-pointer"
            >
              Enable Best Selling Products?
            </Label>
          </div>
          {bestSellingEnable ? (
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.bestSelling.title')}
              error={t(errors?.settings?.bestSelling?.title?.message)}
              required
            />
          ) : (
            ''
          )}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.popularProducts.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.popularProducts.enable"
            >
              Enable Popular Products?
            </Label>
          </div>
          {popularProductsEnable ? (
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.popularProducts.title')}
              error={t(errors?.settings?.popularProducts?.title?.message)}
              required
            />
          ) : (
            ''
          )}
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
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.category.title')}
              error={t(errors?.settings?.category?.title?.message)}
              required
            />
          ) : (
            ''
          )}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.handpickedProducts.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.handpickedProducts.enable"
            >
              Enable Handpicked Products?
            </Label>
          </div>
          {handpickedProductsEnable ? (
            <>
              <Input
                label={t('form:input-title')}
                variant="outline"
                {...register('settings.handpickedProducts.title')}
                error={t(errors?.settings?.handpickedProducts?.title?.message)}
              />
              <div className="flex items-center gap-x-4">
                <SwitchInput
                  name="settings.handpickedProducts.enableSlider"
                  control={control}
                />
                <Label
                  className="mb-0 cursor-pointer"
                  htmlFor="settings.handpickedProducts.enableSlider"
                >
                  Enable Slider?
                </Label>
              </div>
              <div className="grid gap-5">
                <CategoryTypeFilter
                  className="w-full"
                  type={type}
                  enableCategory
                  enableType
                  onCategoryFilter={(category: Category) => {
                    setCategory(category?.slug!);
                  }}
                  onTypeFilter={(type: Type) => {
                    setType(type?.slug!);
                  }}
                />
                <div>
                  <Label>
                    Products <span className="ml-0.5 text-red-500">*</span>
                  </Label>
                  <SelectInput
                    name="settings.handpickedProducts.products"
                    control={control}
                    getOptionLabel={(option: any) => option.name}
                    getOptionValue={(option: any) => option.id}
                    options={products}
                    isClearable={true}
                    isLoading={loadingProduct}
                    isMulti
                  />
                  <ValidationError
                    message={t(
                      errors?.settings?.handpickedProducts?.products?.message,
                    )}
                  />
                </div>
              </div>
            </>
          ) : (
            ''
          )}
          <div className="flex items-center gap-x-4">
            <SwitchInput name="settings.newArrival.enable" control={control} />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.newArrival.enable"
            >
              Enable New Arrival?
            </Label>
          </div>
          {newArrivalEnable ? (
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.newArrival.title')}
              error={t(errors?.settings?.newArrival?.title?.message)}
              required
            />
          ) : (
            ''
          )}
          <div className="flex items-center gap-x-4">
            <SwitchInput name="settings.authors.enable" control={control} />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.authors.enable"
            >
              Enable Authors?
            </Label>
          </div>
          {authorsEnable ? (
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.authors.title')}
              error={t(errors?.settings?.authors?.title?.message)}
              required
            />
          ) : (
            ''
          )}
          <div className="flex items-center gap-x-4">
            <SwitchInput
              name="settings.manufactures.enable"
              control={control}
            />
            <Label
              className="mb-0 cursor-pointer"
              htmlFor="settings.manufactures.enable"
            >
              Enable Manufactures?
            </Label>
          </div>
          {manufacturesEnable ? (
            <Input
              label={t('form:input-title')}
              variant="outline"
              {...register('settings.manufactures.title')}
              error={t(errors?.settings?.manufactures?.title?.message)}
              required
            />
          ) : (
            ''
          )}
        </div>
      </Card>
    </div>
  );
}
