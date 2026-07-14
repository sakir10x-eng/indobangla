import Card from '@/components/common/card';
import { CommonProps } from '@/components/group/form-parts/type';
import { layoutTypes, productCards } from '@/components/group/constant';
import { typeIconList } from '@/components/group/group-icons';
import { EditIcon } from '@/components/icons/edit';
import * as typeIcons from '@/components/icons/type';
import Checkbox from '@/components/ui/checkbox/checkbox';
import Description from '@/components/ui/description';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import RadioCard from '@/components/ui/radio-card/radio-card';
import SelectInput from '@/components/ui/select-input';
import { getIcon } from '@/utils/get-icon';
import { useTranslation } from 'next-i18next';

export const updatedIcons = typeIconList.map((item: any) => {
  item.label = (
    <div className="flex items-center space-s-5">
      <span className="flex items-center justify-center w-5 h-5">
        {getIcon({
          iconList: typeIcons,
          iconName: item.value,
          className: 'max-h-full max-w-full',
        })}
      </span>
      <span>{item.label}</span>
    </div>
  );
  return item;
});

export default function CommonFormPart({
  initialValues,
  register,
  errors,
  isSlugEditable,
  isSlugDisable,
  setIsSlugDisable,
  slugAutoSuggest,
  control,
}: CommonProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-wrap my-5 sm:my-8">
        <Description
          title={t('form:item-description')}
          details={`${
            initialValues
              ? t('form:item-description-update')
              : t('form:item-description-add')
          } ${t('form:group-description-help-text')}`}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <Input
            label={t('form:input-label-name')}
            {...register('name')}
            error={t(errors.name?.message!)}
            variant="outline"
            className="mb-5"
            // disabled={[].includes(Config.defaultLanguage)}
          />
          {isSlugEditable ? (
            <div className="relative mb-5">
              <Input
                label={t('form:input-label-slug')}
                {...register('slug')}
                error={t(errors.slug?.message!)}
                variant="outline"
                disabled={isSlugDisable}
              />
              <button
                className="absolute top-[27px] right-px z-0 flex h-[46px] w-11 items-center justify-center rounded-tr rounded-br border-l border-solid border-border-base bg-white px-2 text-body transition duration-200 hover:text-heading focus:outline-none"
                type="button"
                title={t('common:text-edit')}
                onClick={() => setIsSlugDisable(false)}
              >
                <EditIcon width={14} />
              </button>
            </div>
          ) : (
            <Input
              label={t('form:input-label-slug')}
              {...register('slug')}
              value={slugAutoSuggest}
              variant="outline"
              className="mb-5"
              disabled
            />
          )}

          <div className="mb-5">
            <Label>{t('form:input-label-select-icon')}</Label>
            <SelectInput
              name="icon"
              control={control}
              options={updatedIcons}
              isClearable={true}
              placeholder="Select Icon"
            />
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap pb-8 my-5 border-b border-dashed border-border-base sm:my-8">
        <Description
          title={t('form:group-settings')}
          details={t('form:group-settings-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />
        <Card className="w-full sm:w-8/12 md:w-2/3">
          <Checkbox
            {...register('settings.isHome')}
            error={t(errors.settings?.isHome?.message!)}
            label={t('form:input-label-is-home')}
            className="mb-5"
          />
          <div className="mb-10">
            <Label className="mb-5">{t('form:input-label-layout-type')}</Label>

            <div className="grid grid-cols-3 gap-5">
              {layoutTypes?.map((layout, index) => {
                return (
                  <RadioCard
                    key={index}
                    {...register('settings.layoutType')}
                    label={t(layout.label)}
                    value={layout.value}
                    src={layout.img}
                    id={layout?.value}
                  />
                );
              })}
            </div>
          </div>
          <div className="mb-5">
            <Label className="mb-5">
              {t('form:input-label-product-card-type')}
            </Label>

            <div className="grid grid-cols-3 gap-5">
              {productCards?.map((productCard, index) => {
                return (
                  <RadioCard
                    key={`product-card-${index}`}
                    {...register('settings.productCard')}
                    label={t(productCard.label)}
                    value={productCard.value}
                    src={productCard.img}
                    id={`product-card-${index}`}
                  />
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
