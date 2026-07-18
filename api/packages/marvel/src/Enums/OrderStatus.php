<?php


namespace Marvel\Enums;

use BenSampo\Enum\Enum;

/**
 * Class RoleType
 * @package App\Enums
 */
final class OrderStatus extends Enum
{
    public const PENDING              = 'order-pending';
    public const CONFIRMED            = 'order-confirmed';
    public const PLACED               = 'order-placed';
    public const PROCESSING           = 'order-processing';
    public const COMPLETED            = 'order-completed';
    public const CANCELLED            = 'order-cancelled';
    public const REFUNDED             = 'order-refunded';
    public const FAILED               = 'order-failed';
    public const AT_LOCAL_FACILITY    = 'order-at-local-facility';
    public const OUT_FOR_DELIVERY     = 'order-out-for-delivery';

    // Courier-driven statuses (RedX). Deliberately NON-accounting — like order-void
    // they are in no revenue/paid whitelist, so they are excluded from every money
    // query for free; only order-completed counts as earned revenue. These back the
    // RedX status map in IntegrationController::REDX_STATUS_DEFAULTS.
    public const SHIPPED              = 'order-shipped';
    public const IN_TRANSIT           = 'order-in-transit';
    public const PARTIAL_DELIVERED    = 'order-partial-delivered';
    public const ON_HOLD              = 'order-on-hold';

    /**
     * IndoBangla: a test / mistaken order the desk has written off.
     *
     * Void is a status rather than a flag on purpose. Every revenue and analytics query here
     * whitelists the statuses it counts, so a status nobody listed is excluded from all of them
     * for free — which is exactly what "kono accounting e hiseb hbe na" asks for. Its books are
     * released back to stock by the Order model's updated hook.
     */
    public const VOID                 = 'order-void';

    public const DEFAULT_ORDER_STATUS = 'order-pending';
}
