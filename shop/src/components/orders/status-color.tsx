const StatusColor = (status: string) => {
  let bg_class = '';
  if (
    status?.toLowerCase() === 'order-pending' ||
    status?.toLowerCase() === 'payment-pending'
  ) {
    bg_class = 'bg-status-pending bg-opacity-[.15] text-status-pending';
  } else if (
    status?.toLowerCase() === 'order-processing' ||
    status?.toLowerCase() === 'payment-processing'
  ) {
    bg_class = 'bg-status-processing bg-opacity-[.15] text-status-processing';
  } else if (
    status?.toLowerCase() === 'order-completed' ||
    status?.toLowerCase() === 'payment-success'
  ) {
    bg_class = 'bg-status-complete bg-opacity-[.15] text-status-complete';
  } else if (
    status?.toLowerCase() === 'order-cancelled' ||
    status?.toLowerCase() === 'payment-reversal'
  ) {
    bg_class = 'bg-status-canceled bg-opacity-[.15] text-status-canceled';
  } else if (
    status?.toLowerCase() === 'order-failed' ||
    status?.toLowerCase() === 'payment-failed'
  ) {
    bg_class = 'bg-status-failed bg-opacity-[.15] text-status-failed';
  } else if (
    status?.toLowerCase() === 'order-refunded' ||
    status?.toLowerCase() === 'refunded' ||
    status?.toLowerCase() === 'payment-refunded'
  ) {
    bg_class = 'bg-rose-400 bg-opacity-10 text-status-pending';
  } else if (status?.toLowerCase() === 'order-at-local-facility') {
    bg_class = 'bg-status-out-for-delivery bg-opacity-[.15] text-status-out-for-delivery';
  } else if (status?.toLowerCase() === 'order-out-for-delivery') {
    bg_class = 'bg-status-out-for-delivery bg-opacity-[.15] text-status-out-for-delivery';
  } else if (
    ['approved', 'success', 'complete', 'delivered', 'paid', 'active', 'publish', 'accepted'].some(
      (k) => status?.toLowerCase().includes(k),
    )
  ) {
    // any positive / approved state reads green, never red
    bg_class = 'bg-status-complete bg-opacity-[.15] text-status-complete';
  } else {
    // neutral for anything unknown — red is reserved for failed/cancelled
    bg_class = 'bg-gray-200 bg-opacity-60 text-gray-600';
  }

  return bg_class;
};

export default StatusColor;
