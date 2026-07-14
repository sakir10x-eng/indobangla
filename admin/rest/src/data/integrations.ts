import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';

const COURIER_KEY = 'courier-settings';
const PAYMENT_KEY = 'payment-settings-ib';
const IMAGE_SIZES_KEY = 'image-sizes-settings';
const RESELL_KEY = 'resell-admin-list';
const RESELLER_KEY = 'reseller-admin';
const BANNERS_KEY = 'rotating-banners-settings';
const PREHOME_KEY = 'prehome-settings';
const WISHLIST_KEY = 'wishlist-insights';
const CONVERSION_KEY = 'conversion-settings';

// #6 — vendors report
export const useVendorReportQuery = () => {
  const { data, isLoading } = useQuery(['vendor-report'], () => HttpClient.get<any>('vendor-report'));
  return { vendors: data?.data ?? [], loading: isLoading };
};

// #7 — conversion-rate pricing
export const useConversionQuery = () => {
  const { data, isLoading } = useQuery([CONVERSION_KEY], () => HttpClient.get<any>('conversion-settings'));
  return { config: data, loading: isLoading };
};
export const useUpdateConversionMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('conversion-settings', input), {
    onSuccess: () => toast.success('Conversion settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([CONVERSION_KEY]),
  });
};
export const useConversionApplyMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('conversion-apply', input), {
    onSuccess: (r: any) => {
      if (r?.mode === 'set_mrp') toast.success(`MRP set for ${r?.updated ?? 0} books`);
      else toast.success(`${r?.changed ?? 0} book price(s) changed${r?.without_mrp ? ` · ${r.without_mrp} skipped (no MRP)` : ''}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([CONVERSION_KEY + ':status']),
  });
};
export const useConversionCouponMutation = () => {
  return useMutation((input: any) => HttpClient.post<any>('conversion-coupon', input), {
    onSuccess: (r: any) => toast.success(r?.message || `Coupon ${r?.code} = ${r?.percent}% off`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
};
const MEMBER_KEY = 'membership-tiers';
export const useMembershipTiersQuery = () => {
  const { data, isLoading } = useQuery([MEMBER_KEY], () => HttpClient.get<any>('membership-tiers'));
  return { info: data, loading: isLoading };
};
export const useUpdateMembershipTiersMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('membership-tiers', input), {
    onSuccess: (r: any) => toast.success(`Tier rates saved · ${r?.synced ?? 0} member card(s) updated`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([MEMBER_KEY]),
  });
};
export const useMembershipSearchQuery = (q: string) => {
  const { data } = useQuery([MEMBER_KEY, 'search', q], () => HttpClient.get<any>('membership-search', { q }), {
    enabled: q.trim().length > 1,
  });
  return (data as any)?.data ?? [];
};
export const useMembershipAssignMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('membership-assign', input), {
    onSuccess: (r: any) => toast.success(r?.message || 'Saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([MEMBER_KEY]),
  });
};

export const useConversionStatusQuery = () => {
  const { data } = useQuery([CONVERSION_KEY + ':status'], () => HttpClient.get<any>('conversion-status'));
  return { total: data?.total ?? 0, withMrp: data?.with_mrp ?? 0, withoutMrp: data?.without_mrp ?? 0 };
};

// #7 — saved-books (wishlist) insights + quick price edit
export const useWishlistInsightsQuery = (params: any = {}) => {
  const { data, isLoading, isFetching } = useQuery(
    [WISHLIST_KEY, params],
    () => HttpClient.get<any>('wishlist-insights', params),
    { keepPreviousData: true },
  );
  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    lastPage: data?.last_page ?? 1,
    authors: data?.authors ?? [],
    publishers: data?.publishers ?? [],
    loading: isLoading,
    fetching: isFetching,
  };
};
export const useQuickPriceMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('product-quick-price', input), {
    onSuccess: () => toast.success('Price updated'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([WISHLIST_KEY]),
  });
};

// #8 — pre-home intro page toggle
export const usePrehomeQuery = () => {
  const { data } = useQuery([PREHOME_KEY], () => HttpClient.get<any>('prehome-settings'));
  return { enabled: !!data?.enabled };
};
export const useUpdatePrehomeMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('prehome-settings', input), {
    onSuccess: (r: any) => toast.success(r?.enabled ? 'Pre-home page ON' : 'Pre-home page OFF'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([PREHOME_KEY]),
  });
};

// #1 — rotating hero banners
export const useRotatingBannersQuery = () => {
  const { data, isLoading } = useQuery([BANNERS_KEY], () => HttpClient.get<any>('rotating-banners-settings'));
  return { banners: data?.banners ?? [], loading: isLoading };
};
export const useUpdateRotatingBannersMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('rotating-banners-settings', input), {
    onSuccess: () => toast.success('Banners saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([BANNERS_KEY]),
  });
};

// Mode B — reseller business admin
export const useResellerConfigQuery = () => {
  const { data, isLoading } = useQuery([RESELLER_KEY, 'config'], () => HttpClient.get<any>('reseller/admin/config'));
  return { config: data, loading: isLoading };
};
export const useUpdateResellerConfigMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('reseller/admin/config', input), {
    onSuccess: () => toast.success('Reseller settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([RESELLER_KEY]),
  });
};
export const useResellerListQuery = () => {
  const { data, isLoading } = useQuery([RESELLER_KEY, 'list'], () => HttpClient.get<any>('reseller/admin/list'));
  return { resellers: data?.data ?? [], loading: isLoading };
};
export const useResellerPayoutsQuery = () => {
  const { data, isLoading } = useQuery([RESELLER_KEY, 'payouts'], () => HttpClient.get<any>('reseller/admin/payouts'));
  return { payouts: data?.data ?? [], loading: isLoading };
};
export const useResellerActionMutation = (endpoint: string) => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>(`reseller/admin/${endpoint}`, input), {
    onSuccess: () => toast.success('Done'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([RESELLER_KEY]),
  });
};

// Mode A — admin resell moderation
export const useResellListQuery = (status?: string) => {
  const { data, isLoading } = useQuery([RESELL_KEY, status], () =>
    HttpClient.get<any>('resell/admin/list', status ? { status } : {})
  );
  return { items: data?.data ?? [], loading: isLoading };
};

export const useResellModerateMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('resell/admin/moderate', input), {
    onSuccess: () => toast.success('Updated'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([RESELL_KEY]),
  });
};

export const useResellMarkSoldMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('resell/admin/mark-sold', input), {
    onSuccess: (r: any) => toast.success(r?.credited ? `Seller credited ৳${r.credited}` : 'Marked sold'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([RESELL_KEY]),
  });
};
const FEATURED_BOOKS_KEY = 'featured-books-settings';

// #2 — curated banner/FBT book selection
export const useFeaturedBooksQuery = () => {
  const { data, isLoading } = useQuery([FEATURED_BOOKS_KEY], () =>
    HttpClient.get<any>('featured-books-settings')
  );
  return { featured: data, loading: isLoading };
};

export const useUpdateFeaturedBooksMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('featured-books-settings', input), {
    onSuccess: () => toast.success('Featured books saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([FEATURED_BOOKS_KEY]),
  });
};

// #1 — storefront image sizes (single cover / FBT cover / home columns)
export const useImageSizesQuery = () => {
  const { data, isLoading } = useQuery([IMAGE_SIZES_KEY], () =>
    HttpClient.get<any>('image-sizes-settings')
  );
  return { sizes: data, loading: isLoading };
};

export const useUpdateImageSizesMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('image-sizes-settings', input), {
    onSuccess: () => toast.success('Image sizes saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([IMAGE_SIZES_KEY]),
  });
};

export const useCourierSettingsQuery = () => {
  const { data, isLoading } = useQuery([COURIER_KEY], () =>
    HttpClient.get<any>('courier-settings')
  );
  return { couriers: data?.couriers, loading: isLoading };
};

export const useUpdateCourierMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('courier-settings', input), {
    onSuccess: () => toast.success('Courier saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([COURIER_KEY]),
  });
};

export const useTestCourierMutation = () => {
  return useMutation((provider: string) =>
    HttpClient.post<any>(`courier-test/${provider}`, {})
  );
};

export const useTestPaymentMutation = () => {
  return useMutation((gateway: string) =>
    HttpClient.post<any>(`payment-test/${gateway}`, {})
  );
};

export const usePaymentSettingsQuery = () => {
  const { data, isLoading } = useQuery([PAYMENT_KEY], () =>
    HttpClient.get<any>('payment-settings-ib')
  );
  return { payments: data?.payments, loading: isLoading };
};

export const useUpdatePaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('payment-settings-ib', input), {
    onSuccess: () => toast.success('Payment gateway saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([PAYMENT_KEY]),
  });
};

const REPLYGENIE_KEY = 'replygenie-settings';

export const useReplygenieSettingsQuery = () => {
  const { data, isLoading } = useQuery([REPLYGENIE_KEY], () =>
    HttpClient.get<any>('replygenie-settings')
  );
  return { replygenie: data?.replygenie, loading: isLoading };
};

export const useUpdateReplygenieMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('replygenie-settings', input), {
    onSuccess: () => toast.success('ReplyGenie settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([REPLYGENIE_KEY]),
  });
};

export const useTestReplygenieMutation = () => {
  return useMutation(() => HttpClient.get<any>('replygenie-test'));
};

const NOTIFY_KEY = 'notify-settings';

export const useNotifySettingsQuery = () => {
  const { data, isLoading } = useQuery([NOTIFY_KEY], () =>
    HttpClient.get<any>('notify-settings')
  );
  return { notify: data?.notify, loading: isLoading };
};

export const useUpdateNotifyMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('notify-settings', input), {
    onSuccess: () => toast.success('Notification settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([NOTIFY_KEY]),
  });
};

export const useTestNotifyMutation = () => {
  return useMutation(() => HttpClient.post<any>('notify-test', {}));
};

const CLUB_KEY = 'club-settings';

export const useClubSettingsQuery = () => {
  const { data, isLoading } = useQuery([CLUB_KEY], () =>
    HttpClient.get<any>('club-settings')
  );
  return { club: data?.club, loading: isLoading };
};

export const useUpdateClubMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('club-settings', input), {
    onSuccess: () => toast.success('Readers’ Club settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([CLUB_KEY]),
  });
};

const TIERS_KEY = 'order-discount-settings';

export const useDiscountTiersQuery = () => {
  const { data, isLoading } = useQuery([TIERS_KEY], () =>
    HttpClient.get<any>('order-discount-settings')
  );
  return { tiers: data?.tiers, loading: isLoading };
};

export const useUpdateDiscountTiersMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('order-discount-settings', input), {
    onSuccess: () => toast.success('Discount tiers saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
    onSettled: () => qc.invalidateQueries([TIERS_KEY]),
  });
};

/* ---------------------------------------------------------------- PRE-ORDER */
const PREORDER_KEY = 'preorder';

export const usePreorderSummaryQuery = () => {
  const { data, isLoading } = useQuery([PREORDER_KEY, 'summary'], () =>
    HttpClient.get<any>('preorder-summary'),
  );
  return {
    counts: (data as any)?.counts ?? { pending_advance: 0, processing: 0, delivered: 0, overdue: 0, total: 0 },
    overdue: (data as any)?.overdue ?? [],
    windowDays: (data as any)?.window_days ?? 28,
    loading: isLoading,
  };
};

export const usePreorderProductsQuery = () => {
  const { data, isLoading } = useQuery([PREORDER_KEY, 'products'], () =>
    HttpClient.get<any>('preorder-products'),
  );
  return { products: (data as any)?.data ?? [], loading: isLoading };
};

export const usePreorderUpdateMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('preorder-update', input), {
    onSuccess: () => toast.success('Pre-order settings saved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([PREORDER_KEY]),
  });
};

/* ------------------------------------------------- customers overview page */
export const useCustomersOverviewQuery = (params: any = {}) => {
  const { data, isLoading, isFetching } = useQuery(
    ['customers-overview', params],
    () => HttpClient.get<any>('customers-overview', params),
    { keepPreviousData: true },
  );
  return {
    customers: (data as any)?.data ?? [],
    stats: (data as any)?.stats ?? {},
    trend: (data as any)?.trend ?? [],
    total: (data as any)?.total ?? 0,
    lastPage: (data as any)?.last_page ?? 1,
    loading: isLoading,
    fetching: isFetching,
  };
};

/* ------------------------------------------------- 1-minute book challenge */
const CHALLENGE_KEY = 'challenge-settings';

export const useChallengeSettingsQuery = () => {
  const { data, isLoading } = useQuery([CHALLENGE_KEY], () =>
    HttpClient.get<any>('challenge-settings'),
  );
  return { config: data as any, loading: isLoading };
};

export const useUpdateChallengeSettingsMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('challenge-settings', input), {
    onSuccess: () => toast.success('চ্যালেঞ্জ সেটিংস সেভ হয়েছে'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([CHALLENGE_KEY]),
  });
};

/* ------------------------------------------------- manual pre-order desk */
const PREORDER_DESK_KEY = 'preorder-settings';

export const usePreorderSettingsQuery = () => {
  const { data, isLoading } = useQuery([PREORDER_DESK_KEY], () =>
    HttpClient.get<any>('preorder-settings'),
  );
  return { config: data as any, loading: isLoading };
};

export const useUpdatePreorderSettingsMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('preorder-settings', input), {
    onSuccess: () => toast.success('প্রি-অর্ডার সেটিংস সেভ হয়েছে'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([PREORDER_DESK_KEY]),
  });
};

/** Price a book from its source price + weight (rate picked off the link's domain). */
export const usePreorderQuoteMutation = () =>
  useMutation((input: any) => HttpClient.post<any>('preorder-quote', input), {
    onError: (e: any) => toast.error(e?.response?.data?.message || 'দাম হিসাব করা যায়নি'),
  });

/** Create the whole pre-order — customer, books, order, pay link — in one call. */
export const useCreatePreorderMutation = () =>
  useMutation((input: any) => HttpClient.post<any>('preorder-create', input), {
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'প্রি-অর্ডার তৈরি করা যায়নি'),
  });

/* ------------------------------------------------- payment-link lifetime (#1) */
const PAYLINK_KEY = 'pay-link-settings';
export const usePayLinkSettingsQuery = () => {
  const { data } = useQuery([PAYLINK_KEY], () => HttpClient.get<any>('pay-link-settings'));
  return { hours: (data as any)?.hours ?? 6 };
};
export const useUpdatePayLinkSettingsMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.put<any>('pay-link-settings', input), {
    onSuccess: (r: any) => toast.success(`পেমেন্ট লিংক এখন ${r?.hours} ঘণ্টা কাজ করবে`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([PAYLINK_KEY]),
  });
};

/* --------------------------------------- move a book between orders (#4) */
export const useOrderMoveItemMutation = () => {
  return useMutation((input: any) => HttpClient.post<any>('order-move-item', input), {
    onSuccess: (r: any) => toast.success(r?.message || 'Moved'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
};

/* --------------------------------------- abandoned checkouts (#20) */
const ABANDON_KEY = 'abandoned-checkouts';
export const useAbandonedCheckoutsQuery = () => {
  const { data, isLoading } = useQuery([ABANDON_KEY], () => HttpClient.get<any>('abandoned-checkouts'));
  return {
    items: (data as any)?.data ?? [],
    total: (data as any)?.total ?? 0,
    value: (data as any)?.value ?? 0,
    loading: isLoading,
  };
};
export const useAbandonedContactedMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('abandoned-contacted', input), {
    onSuccess: () => toast.success('নক দেওয়া হয়েছে বলে চিহ্নিত করা হলো'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([ABANDON_KEY]),
  });
};

/* --------------------------------------- exchange / return (#16, #17) */
const EXCHANGE_KEY = 'exchange-requests';
export const useExchangeListQuery = (status?: string) => {
  const { data, isLoading } = useQuery([EXCHANGE_KEY, status], () =>
    HttpClient.get<any>('exchange-list', status ? { status } : {}),
  );
  return {
    items: (data as any)?.data ?? [],
    counts: (data as any)?.counts ?? {},
    loading: isLoading,
  };
};
export const useExchangeActionMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('exchange-action', input), {
    onSuccess: (r: any) => toast.success(`${r?.new_status}${r?.stock ? ' · ' + r.stock : ''}`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([EXCHANGE_KEY]),
  });
};

/* --------------------------------------- tickets (#10) + restock (#12) */
const TICKET_KEY = 'admin-tickets';
export const useTicketsQuery = (status?: string) => {
  const { data, isLoading } = useQuery([TICKET_KEY, status], () =>
    HttpClient.get<any>('admin-tickets', status ? { status } : {}),
  );
  return { tickets: (data as any)?.data ?? [], counts: (data as any)?.counts ?? {}, loading: isLoading };
};
export const useTicketReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('ticket-reply', input), {
    onSuccess: () => toast.success('উত্তর পাঠানো হয়েছে'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([TICKET_KEY]),
  });
};
export const useTicketStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('ticket-status', input), {
    onSuccess: () => toast.success('স্ট্যাটাস আপডেট হয়েছে'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([TICKET_KEY]),
  });
};

const RESTOCK_KEY = 'restock-list';
export const useRestockListQuery = (status?: string) => {
  const { data, isLoading } = useQuery([RESTOCK_KEY, status], () =>
    HttpClient.get<any>('restock-list', status ? { status } : {}),
  );
  return {
    items: (data as any)?.data ?? [],
    demand: (data as any)?.demand ?? {},
    counts: (data as any)?.counts ?? {},
    loading: isLoading,
  };
};
export const useRestockActionMutation = () => {
  const qc = useQueryClient();
  return useMutation((input: any) => HttpClient.post<any>('restock-action', input), {
    onSuccess: (r: any) => toast.success(r?.message || r?.new_status),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
    onSettled: () => qc.invalidateQueries([RESTOCK_KEY]),
  });
};

/* --------------------------------------- feature registry + live health */
export const useFeatureRegistryQuery = () => {
  const { data, isLoading, isFetching, refetch } = useQuery(
    ['feature-registry'],
    () => HttpClient.get<any>('feature-registry'),
    { refetchInterval: 60_000 },   // keep the health dots live
  );
  return {
    features: (data as any)?.data ?? [],
    counts: (data as any)?.counts ?? {},
    checkedAt: (data as any)?.checked_at ?? null,
    loading: isLoading,
    isFetching,
    refetch,
  };
};
