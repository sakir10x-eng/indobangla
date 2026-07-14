import Card from '@/components/common/card';
import { SortableList } from '@/components/drag-and-drop';
import { combinedKeys, combinedKeysTitle } from '@/components/group/constant';
import Description from '@/components/ui/description';
import { cn } from '@/lib/utils';
import { scrollToSection } from '@/utils/scroll-to-section';
import { isEmpty } from 'lodash';
import { useTranslation } from 'next-i18next';
import { twMerge } from 'tailwind-merge';
import { RearrangeFormPartProps } from '@/components/group/form-parts/type';

export default function RearrangeFormPart({
  groupItems,
  setGroupsItems,
  data,
  className,
  ...props
}: RearrangeFormPartProps) {
  const { t } = useTranslation();
  return (
    !isEmpty(groupItems) &&
    groupItems && (
      <div
        className={twMerge(
          cn(
            'flex flex-wrap items-start pb-8 my-5 border-b border-dashed sm:my-5 border-border-base',
            className,
          ),
        )}
        {...props}
      >
        <Description
          title={t('form:text-rearrange-page-sections')}
          details={t('form:text-set-your-page-sections-from-here')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full p-0 sm:w-8/12 md:w-2/3 md:p-0">
          <SortableList
            title={t('form:text-rearrange-page-sections')}
            items={groupItems}
            onChange={setGroupsItems}
            renderItem={(item) => {
              const widgetTitle = data?.content?.find(
                (data) => data?.props?.id === item?.id,
              )?.props?.widgetTitle;

              return (
                <SortableList.Item id={item?.id}>
                  <span
                    onClick={() => scrollToSection({ id: item?.id as string })}
                    className="cursor-pointer"
                  >
                    {combinedKeys.includes(item?.id)
                      ? combinedKeysTitle?.[
                          item?.id as keyof typeof combinedKeysTitle
                        ]
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
    )
  );
}
