import Card from '@/components/common/card';
import Alert from '@/components/ui/alert';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import FileInput from '@/components/ui/file-input';
import ValidationError from '@/components/ui/form-validation-error';
import Input from '@/components/ui/input';
import TextArea from '@/components/ui/text-area';
import Title from '@/components/ui/title';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import { BannerFormPartProps } from '@/components/group/form-parts/type';
import { cn } from '@/lib/utils';
import { twMerge } from 'tailwind-merge';

export default function BannerFormPart({
  control,
  register,
  errors,
  layoutType,
  fields,
  remove,
  className,
  ...props
}: BannerFormPartProps) {
  const { t } = useTranslation();

  return (
    <div
      className={twMerge(
        cn(
          'my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8',
          className,
        ),
      )}
      {...props}
    >
      <Description
        title={t('common:text-banner')}
        details={t('form:banner-slider-help-text')}
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />
      <Card className="w-full sm:w-8/12 md:w-2/3">
        {layoutType === 'minimal' && fields?.length > 0 ? (
          <Alert
            className="mb-5"
            message="Minimal demo will show only first item of banner."
          />
        ) : (
          ''
        )}
        {(layoutType === 'compact' || layoutType === 'minimal') &&
        fields?.length > 0 ? (
          <Alert
            className="mb-5"
            message="Disabled item will not show in shop end."
            variant="warning"
          />
        ) : (
          ''
        )}

        <div>
          {fields?.map((item: any & { id: string }, index: number) => (
            <div
              className="py-5 border-b border-dashed border-border-200 first:pt-0 last:border-0 md:py-8"
              key={item.id}
            >
              <div className="flex items-center justify-between mb-5">
                <Title className="mb-0">
                  {t('common:text-banner')} {index + 1}
                </Title>
                <button
                  onClick={() => {
                    remove(index);
                  }}
                  type="button"
                  className={classNames(
                    'text-sm text-red-500 transition-colors duration-200 hover:text-red-700 focus:outline-none sm:col-span-1 sm:mt-4',
                    layoutType === 'minimal' && index !== 0 && index > 0
                      ? 'pointer-events-none cursor-not-allowed text-opacity-80'
                      : '',
                  )}
                  disabled={
                    layoutType === 'minimal' && index !== 0 && index > 0
                  }
                >
                  {t('form:button-label-remove')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <Input
                  label={t('form:input-title')}
                  variant="outline"
                  {...register(`banners.${index}.title` as const)}
                  defaultValue={item?.title!} // make sure to set up defaultValue
                  error={t(errors.banners?.[index]?.title?.message!)}
                  disabled={
                    layoutType === 'compact' ||
                    (layoutType === 'minimal' && index !== 0 && index > 0)
                  }
                />
                <TextArea
                  label={t('form:input-description')}
                  variant="outline"
                  {...register(`banners.${index}.description` as const)}
                  defaultValue={item.description!} // make sure to set up defaultValue
                  disabled={
                    layoutType === 'compact' ||
                    (layoutType === 'minimal' && index !== 0 && index > 0)
                  }
                />
              </div>

              <div className="mt-5 w-full">
                <Title>
                  {t('form:input-gallery')}
                  {layoutType === 'compact' ? (
                    <span className="ml-0.5 text-red-500">*</span>
                  ) : (
                    ''
                  )}
                </Title>
                <FileInput
                  name={`banners.${index}.image`}
                  control={control}
                  multiple={false}
                  disabled={
                    layoutType === 'minimal' && index !== 0 && index > 0
                  }
                />
                <ValidationError
                  message={t(errors?.banners?.[index]?.image?.message!)}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() =>
            // @ts-ignore
            append({ title: '', description: '', image: {} })
          }
          className="w-full sm:w-auto"
          disabled={layoutType === 'minimal' && fields?.length > 0}
        >
          {t('form:button-label-add-banner')}
        </Button>

        {errors?.banners?.message ? (
          <Alert
            message={t(errors?.banners?.message)}
            variant="error"
            className="mt-5"
          />
        ) : null}
      </Card>
    </div>
  );
}
