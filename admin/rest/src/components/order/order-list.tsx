import ActionButtons from '@/components/common/action-buttons';
import Avatar from '@/components/common/avatar';
import { ChatIcon } from '@/components/icons/chat';
import { NoDataFound } from '@/components/icons/no-data-found';
import StatusColor from '@/components/order/status-color';
import Badge from '@/components/ui/badge/badge';
import Pagination from '@/components/ui/pagination';
import { PriceCell } from '@/components/ui/price-cell';
import { Table } from '@/components/ui/table';
import TitleWithSort from '@/components/ui/title-with-sort';
import { useCreateConversations } from '@/data/conversations';
import { MappedPaginatorInfo, Order, Product, SortOrder, User } from '@/types';
import { getAuthCredentials } from '@/utils/auth-utils';
import { SUPER_ADMIN } from '@/utils/constants';
import { useIsRTL } from '@/utils/locals';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { AlignType } from 'rc-table/lib/interface';
import { useState } from 'react';

type IProps = {
  orders: Order[] | undefined;
  paginatorInfo: MappedPaginatorInfo | null;
  onPagination: (current: number) => void;
  onSort: (current: any) => void;
  onOrder: (current: string) => void;
};

const OrderList = ({
  orders,
  paginatorInfo,
  onPagination,
  onSort,
  onOrder,
}: IProps) => {
  // const { data, paginatorInfo } = orders! ?? {};
  const router = useRouter();
  const { t } = useTranslation();
  const rowExpandable = (record: any) => record.children?.length;
  const { alignLeft, alignRight } = useIsRTL();
  const { permissions } = getAuthCredentials();
  const { mutate: createConversations, isLoading: creating } =
    useCreateConversations();
  const [loading, setLoading] = useState<boolean | string | undefined>(false);
  const [sortingObj, setSortingObj] = useState<{
    sort: SortOrder;
    column: string | null;
  }>({
    sort: SortOrder.Desc,
    column: null,
  });

  const onSubmit = async (shop_id: string | undefined) => {
    setLoading(shop_id);
    createConversations({
      shop_id: Number(shop_id),
      via: 'admin',
    });
  };

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

  const columns = [
    {
      title: t('table:table-item-tracking-number'),
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      align: alignLeft as AlignType,
      width: 200,
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-customer')}
          ascending={
            sortingObj.sort === SortOrder.Asc && sortingObj.column === 'name'
          }
          isActive={sortingObj.column === 'name'}
        />
      ),
      dataIndex: 'customer',
      key: 'name',
      align: alignLeft as AlignType,
      width: 250,
      onHeaderCell: () => onHeaderClick('name'),
      render: (customer: User) => (
        <div className="flex items-center">
          {/* <Avatar name={customer.name} src={customer?.profile.avatar.thumbnail} /> */}
          <Avatar name={customer?.name} />
          <div className="flex flex-col whitespace-nowrap font-medium ms-2">
            {customer?.name ? customer?.name : t('common:text-guest')}
            <span className="text-[13px] font-normal text-gray-500/80">
              {customer?.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: t('table:table-item-products'),
      dataIndex: 'products',
      key: 'products',
      align: 'center' as AlignType,
      render: (products: Product) => <span>{products?.length}</span>,
    },
    {
      // title: t('table:table-item-order-date'),
      title: (
        <TitleWithSort
          title={t('table:table-item-order-date')}
          ascending={
            sortingObj?.sort === SortOrder?.Asc &&
            sortingObj?.column === 'created_at'
          }
          isActive={sortingObj?.column === 'created_at'}
          className="cursor-pointer"
        />
      ),
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'center' as AlignType,
      onHeaderCell: () => onHeaderClick('created_at'),
      render: (date: string) => {
        dayjs.extend(relativeTime);
        dayjs.extend(utc);
        dayjs.extend(timezone);
        return (
          <span className="whitespace-nowrap">
            {dayjs?.utc(date)?.tz(dayjs?.tz?.guess())?.fromNow()}
          </span>
        );
      },
    },
    {
      title: t('table:table-item-delivery-fee'),
      dataIndex: 'delivery_fee',
      key: 'delivery_fee',
      align: 'center' as AlignType,
      render: (value: number) => <PriceCell price={value} />,
    },
    {
      title: (
        <TitleWithSort
          title={t('table:table-item-total')}
          ascending={
            sortingObj?.sort === SortOrder?.Asc &&
            sortingObj?.column === 'total'
          }
          isActive={sortingObj?.column === 'total'}
          className="cursor-pointer"
        />
      ),
      dataIndex: 'total',
      key: 'total',
      align: 'center' as AlignType,
      width: 120,
      onHeaderCell: () => onHeaderClick('total'),
      render: (value: number) => (
        <span className="whitespace-nowrap">
          <PriceCell price={value} />
        </span>
      ),
    },
    {
      // Payment picture: a 50% pre-order advance reads as "Partial" — advance received
      // on top, and what's still payable on delivery underneath.
      title: 'Payment',
      dataIndex: 'paid_total',
      key: 'paid_total',
      align: 'center' as AlignType,
      width: 150,
      render: (_: any, order: any) => {
        const paid = Number(order?.paid_total) || 0;
        const total = Number(order?.total) || 0;
        const full = total > 0 && paid >= total;
        const partial = paid > 0 && !full;
        return (
          <div className="whitespace-nowrap leading-tight">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                full ? 'bg-emerald-50 text-emerald-700' : partial ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {full ? 'Paid' : partial ? 'Partial' : 'Unpaid'}
            </span>
            {partial && (
              <>
                <div className="mt-1 text-[11px] font-medium text-amber-700">
                  advance <PriceCell price={paid} />
                </div>
                <div className="text-[11px] text-gray-500">
                  payable <PriceCell price={total - paid} />
                </div>
              </>
            )}
            {full && (
              <div className="mt-1 text-[11px] font-medium text-emerald-700">
                <PriceCell price={paid} />
              </div>
            )}
            {!paid && (
              <div className="mt-1 text-[11px] text-gray-500">
                payable <PriceCell price={total} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      // Website order vs one placed by the ReplyGenie agent.
      title: 'Source',
      dataIndex: 'ops_meta',
      key: 'source',
      align: 'center' as AlignType,
      width: 110,
      render: (ops: any) =>
        ops?.created_by ? (
          <span className="whitespace-nowrap rounded-full bg-[#fdf0f1] px-2 py-1 text-[11px] font-semibold text-[#e63946]">
            {ops.created_by}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">Website</span>
        ),
    },
    {
      title: t('table:table-item-status'),
      dataIndex: 'order_status',
      key: 'order_status',
      align: 'center' as AlignType,
      render: (order_status: string) => (
        <Badge text={t(order_status)} color={StatusColor(order_status)} />
      ),
    },
    {
      title: t('table:table-item-actions'),
      dataIndex: 'id',
      key: 'actions',
      align: alignRight as AlignType,
      width: 120,
      render: (id: string, order: Order) => {
        const currentButtonLoading = !!loading && loading === order?.shop_id;
        return (
          <>
            {order?.children?.length ? (
              ''
            ) : permissions?.includes(SUPER_ADMIN) && order?.shop_id ? (
              <button
                onClick={() => onSubmit(order?.shop_id)}
                disabled={currentButtonLoading}
                className="cursor-pointer text-accent transition-colors duration-300 me-1.5 hover:text-accent-hover"
              >
                <ChatIcon width="19" height="20" />
              </button>
            ) : (
              ''
            )}
            <ActionButtons
              id={id}
              detailsUrl={`${router.asPath}/${id}`}
              customLocale={order.language}
            />
          </>
        );
      },
    },
  ];

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
          data={orders}
          rowKey="id"
          scroll={{ x: 1000 }}
          expandable={{
            expandedRowRender: () => '',
            rowExpandable: rowExpandable,
          }}
        />
      </div>

      {!!paginatorInfo?.total && (
        <div className="flex items-center justify-end">
          <Pagination
            total={paginatorInfo?.total}
            current={paginatorInfo?.currentPage}
            pageSize={paginatorInfo?.perPage}
            onChange={onPagination}
          />
        </div>
      )}
    </>
  );
};

export default OrderList;
