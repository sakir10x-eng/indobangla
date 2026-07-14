import Card from '@/components/common/card';
import { GroupConfig } from '@/components/group/builder';
import { PencilIcon } from '@/components/icons/pencil-icon';
import Description from '@/components/ui/description';
import { Routes } from '@/config/routes';
import { Config as PuckConfig, Render } from '@measured/puck';
import { isArray, isEmpty } from 'lodash';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BuilderFormPartsProps } from '@/components/group/form-parts/type';

export default function BuilderFormParts({
  data,
  groupName,
  layoutType,
  setGroupItemsHandler,
  dynamicKeys,
  groupItems,
  setGroupsItems,
  setData,
}: BuilderFormPartsProps) {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation();

  return (
    <>
      {!isEmpty(data?.content) && isArray(data?.content)
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

                <Card className="relative w-full sm:w-8/12 md:w-2/3 group overflow-hidden">
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
                          config={GroupConfig as PuckConfig}
                          data={modifiedData}
                        />
                      </div>
                    </>
                  ) : (
                    <Render
                      config={GroupConfig as PuckConfig}
                      data={modifiedData}
                    />
                  )}
                  <Link
                    href={
                      router?.query?.action === 'edit'
                        ? `/${Routes.type.edit(groupName, locale!)}/builder?id=${item?.props?.id}&layoutType=${layoutType}`
                        : `/${Routes.type.translate(groupName, locale!)}/builder?id=${item?.props?.id}&layoutType=${layoutType}`
                    }
                    className="absolute z-20 inline-flex items-center justify-center flex-shrink-0 gap-1 p-2 text-xs font-semibold leading-none transition duration-300 ease-in-out border border-transparent rounded outline-none opacity-0 focus:outline-none focus:shadow focus:ring-1 focus:ring-slate-700 bg-slate-700 text-light hover:bg-slate-800 right-1 top-1 group-hover:opacity-100"
                    onClick={() => {
                      setGroupItemsHandler(dynamicKeys, groupItems);
                      setGroupsItems(groupItems);
                      setData(data);
                    }}
                  >
                    <PencilIcon height="1em" width="1em" />{' '}
                    {t('form:item-description-edit')}
                  </Link>
                </Card>
              </div>
            );
          })
        : ''}
    </>
  );
}
