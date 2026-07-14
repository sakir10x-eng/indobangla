import { NoDataFound } from '@/components/icons/no-data-found';
import LanguageSwitcher from '@/components/ui/lang-action/action';
import Pagination from '@/components/ui/pagination';
import { AlignType, Table } from '@/components/ui/table';
import TitleWithSort from '@/components/ui/title-with-sort';
import { Routes } from '@/config/routes';
import { siteSettings } from '@/settings/site.settings';
import {
  Attachment,
  Manufacturer,
  MappedPaginatorInfo,
  SortOrder,
} from '@/types';
import { useIsRTL } from '@/utils/locals';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { ManufacturerUpdateCell } from '@/components/manufacturer/update-cell';

type IProps = {
  manufacturers: Manufacturer[] | null | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (current: number) => void;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
};

const ManufacturerList = ({
  manufacturers,
  paginatorInfo,
  onPagination,
  onSort,
  onOrder,
}: IProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { alignLeft } = useIsRTL();

  const [sortingObj, setSortingObj] = useState<{
    sort: SortOrder;
    column: string | null;
  }>({
    sort: SortOrder.Desc,
    column: null,
  });

  const onHeaderClick = (column: string | null) => ({
    onClick: () => {
      onSort((currentSortDirection: SortOrder) =>
        currentSortDirection === SortOrder.Desc
          ? SortOrder.Asc
          : SortOrder.Desc,
      );
      onOrder(column!);

      setSortingObj({
        sort:
          sortingObj.sort === SortOrder.Desc ? SortOrder.Asc : SortOrder.Desc,
        column: column,
      });
    },
  });

  let columns = [
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-id')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'id'
          }
          isActive={sortingObj.column === 'id'}
        />
      ),
      className: 'cursor-pointer',
      dataIndex: 'id',
      key: 'id',
      align: alignLeft as AlignType,
      width: 160,
      onHeaderCell: () => onHeaderClick('id'),
      render: (id: number) => `#${t('table:table-item-id')}: ${id}`,
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-title')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'name'
          }
          isActive={sortingObj.column === 'name'}
        />
      ),
      dataIndex: 'name',
      key: 'name',
      width: 220,
      align: alignLeft as AlignType,
      className: 'cursor-pointer',
      onHeaderCell: () => onHeaderClick('name'),
      render: (name: string, record: Manufacturer) => {
        const image = record.image;
        return (
          <div className="flex items-center">
            <div className="relative aspect-square h-10 w-10 shrink-0 overflow-hidden rounded border border-border-200/80 bg-gray-100 me-2.5">
              <Image
                src={image?.thumbnail ?? siteSettings?.product?.placeholder}
                alt={name}
                fill
                priority={true}
                sizes="(max-width: 768px) 100vw"
              />
            </div>
            <span className="truncate font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      title: t('table:table-item-products'),
      dataIndex: 'products_count',
      key: 'products_count',
      width: 120,
      align: 'center' as AlignType,
    },
    {
      title: t('table:table-item-approval-action'),
      dataIndex: 'is_approved',
      key: 'approve',
      align: 'center' as AlignType,
      width: 150,
      render: (is_approved: boolean, record: Manufacturer) => (
        <ManufacturerUpdateCell is_approved={is_approved} record={record} />
      ),
    },
    {
      title: t('table:table-item-slug'),
      dataIndex: 'slug',
      key: 'slug',
      align: 'center' as AlignType,
      width: 200,
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'slug',
      key: 'actions',
      align: 'right' as AlignType,
      width: 120,
      render: (slug: string, record: Manufacturer) => (
        <LanguageSwitcher
          slug={slug}
          record={record}
          deleteModalView="DELETE_MANUFACTURER"
          routes={Routes?.manufacturer}
        />
      ),
    },
  ];

  if (router?.query?.shop) {
    columns = columns?.filter(
      (col) => col?.key !== 'approve' && col?.key !== 'actions',
    );
  }

  return (
    <>
      <div className="mb-6 overflow-hidden rounded shadow">
        <Table
          columns={columns}
          emptyText={() => (
            <div className="flex flex-col items-center py-7">
              <NoDataFound className="w-52" />
              <div className="mb-1 pt-6 text-base font-semibold text-heading">
                {t('table:empty-table-data')}
              </div>
              <p className="text-[13px]">{t('table:empty-table-sorry-text')}</p>
            </div>
          )}
          data={manufacturers!}
          rowKey="id"
          scroll={{ x: 900 }}
        />
      </div>

      {!!paginatorInfo?.total && (
        <div className="flex items-center justify-end">
          <Pagination
            total={paginatorInfo.total}
            current={paginatorInfo.currentPage}
            pageSize={paginatorInfo.perPage}
            onChange={onPagination}
          />
        </div>
      )}
    </>
  );
};

export default ManufacturerList;
