import Card from '@/components/common/card';
import { FormProps } from '@/components/group/form-parts/type';
import Description from '@/components/ui/description';
import FileInput from '@/components/ui/file-input';
import { cn } from '@/lib/utils';
import { useTranslation } from 'next-i18next';
import { twMerge } from 'tailwind-merge';

export default function PromotionalSliderFormPart({
  control,
  className,
  ...props
}: Pick<FormProps, 'control'> & React.HTMLAttributes<HTMLDivElement>) {
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
        title={t('form:promotional-slider')}
        details={t('form:promotional-slider-help-text')}
        className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
      />
      <Card className="w-full sm:w-8/12 md:w-2/3">
        <FileInput name="promotional_sliders" control={control} />
      </Card>
    </div>
  );
}
