<?php


namespace Marvel\Database\Repositories;

use Carbon\Carbon;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Marvel\Database\Models\Balance;
use Marvel\Database\Models\Coupon;
use Marvel\Exceptions\MarvelException;
use Marvel\Database\Models\Order;
use Marvel\Database\Models\OrderedFile;
use Marvel\Database\Models\OrderWalletPoint;
use Marvel\Database\Models\Wallet;
use Marvel\Database\Models\Product;
use Marvel\Database\Models\Settings;
use Marvel\Database\Models\User;
use Marvel\Database\Models\Variation;
use Marvel\Enums\CouponType;
use Marvel\Enums\OrderStatus;
use Marvel\Enums\Permission;
use Marvel\Enums\ProductType;
use Marvel\Enums\PaymentGatewayType;
use Marvel\Enums\PaymentStatus;
use Marvel\Events\OrderCreated;
use Marvel\Events\OrderProcessed;
use Marvel\Events\OrderReceived;
use Marvel\Exceptions\MarvelBadRequestException;
use Marvel\Traits\CalculatePaymentTrait;
use Marvel\Traits\OrderManagementTrait;
use Marvel\Traits\OrderStatusManagerWithPaymentTrait;
use Marvel\Traits\PaymentTrait;
use Marvel\Traits\VendorDeliveryTrait;
use Marvel\Traits\WalletsTrait;
use Prettus\Repository\Criteria\RequestCriteria;
use Prettus\Repository\Exceptions\RepositoryException;

class OrderRepository extends BaseRepository
{
    use WalletsTrait,
        CalculatePaymentTrait,
        OrderManagementTrait,
        OrderStatusManagerWithPaymentTrait,
        VendorDeliveryTrait,
        PaymentTrait;
    /**
     * @var array
     */
    protected $fieldSearchable = [
        'tracking_number' => 'like',
        'shop_id',
        'language',
    ];
    /**
     * @var string[]
     */
    protected array $dataArray = [
        'tracking_number',
        'customer_id',
        'shop_id',
        'language',
        'order_status',
        'payment_status',
        'amount',
        'sales_tax',
        'paid_total',
        'total',
        'delivery_time',
        'payment_gateway',
        'altered_payment_gateway',
        'discount',
        'coupon_id',
        'logistics_provider',
        'billing_address',
        'shipping_address',
        'delivery_fee',
        'customer_contact',
        'customer_name',
        'note',
    ];

    public function boot()
    {
        try {
            $this->pushCriteria(app(RequestCriteria::class));
        } catch (RepositoryException $e) {
            //
        }
    }

    /**
     * Configure the Model
     **/
    public function model()
    {
        return Order::class;
    }


    /**
     * A fresh pre-order: hold it at PENDING_ADVANCE, record what's owed up front, mint the
     * pay link the customer is sent to, and book the copies against each title's cap.
     */
    private function stampPreorder($order, $products, int $advancePct, bool $payFull): void
    {
        $total = (float) $order->total;
        $advance = $payFull ? $total : round($total * ($advancePct / 100));

        $ops = (array) ($order->ops_meta ?? []);
        $ops['advance'] = [
            'is_preorder' => true,
            'percent'     => $payFull ? 100 : $advancePct,
            'advance_bdt' => round($advance),
            'due_bdt'     => round($total - $advance),
            'status'      => 'pending_advance',
            'paid_full'   => $payFull,
        ];
        $ops['pay_amount']  = round($advance);
        $ops['pay_purpose'] = $payFull ? 'full' : 'advance';
        $ops['pay_token']   = 'pl_' . Str::random(24);
        $order->ops_meta = $ops;
        $order->order_status = OrderStatus::PENDING;
        // The advance has NOT been collected yet — see the note in stampPayLink. Leaving
        // storeOrder's `paid_total = total` here made /pay/{token} tell the customer their
        // pre-order was already paid and hide every payment button.
        $order->paid_total = 0;
        $order->saveQuietly();

        foreach ($products as $line) {
            $book = Product::find($line['product_id'] ?? 0);
            if ($book && $book->is_preorder) {
                $book->preorder_count = (int) $book->preorder_count + (int) ($line['order_quantity'] ?? 1);
                $book->saveQuietly();
            }
        }
    }

    /**
     * Stamp a pay link on a non-pre-order online order (bKash / Nagad etc.) so the
     * shop routes the buyer to /pay/{token} — the same custom pay screen pre-orders
     * use. These BD mobile-money gateways don't use the Stripe payment-intent flow.
     */
    private function stampPayLink($order): void
    {
        $ops = (array) ($order->ops_meta ?? []);
        if (!empty($ops['pay_token'])) {
            return; // already stamped (e.g. by stampPreorder)
        }
        $total = (float) $order->total;
        $ops['pay_amount']  = round($total);
        $ops['pay_purpose'] = 'full';
        $ops['pay_token']   = 'pl_' . Str::random(24);
        $order->ops_meta = $ops;
        // Nothing has been collected yet — this link is the ASK. storeOrder seeds
        // `paid_total = total` (Pickbazar means "total payable" by it), but every custom
        // pay-link reader treats it as "money received": payInfo does
        // `paid = paid_total >= total`, so an unpaid link announced "পেমেন্ট সম্পন্ন" and
        // never even rendered the method buttons. Zero it here, and settlePayment credits it
        // back as the money actually arrives.
        $order->paid_total = 0;
        $order->saveQuietly();
    }

    /**
     * Validate any free-gift lines sent from the shop and force them to zero price.
     *
     * A line marked `is_gift` is only honoured when its product is inside the
     * `gift_product_ids` pool of some *paid* product in the same cart, is in stock,
     * and the number of gifts does not exceed the combined `gift_max` of those paid
     * products. Anything that fails is stripped of its gift flag so it is charged
     * normally (prevents a client from claiming any product for free).
     *
     * @param array $products
     * @return array
     */
    /**
     * Resolve the priced item behind a cart line, exactly as calculateSubtotal does.
     *
     * Gift pricing and the subtotal must read the same figure off the same row, or the gift
     * discount stops cancelling the gift line and the customer is charged.
     *
     * @param array $line
     * @return Variation|Product|null
     */
    private function resolveLineItem(array $line)
    {
        return isset($line['variation_option_id'])
            ? Variation::find($line['variation_option_id'])
            : Product::find($line['product_id'] ?? 0);
    }

    private function guardGifts(array $products): array
    {
        $giftLines = array_filter($products, fn ($p) => !empty($p['is_gift']));
        if (empty($giftLines)) {
            return $products;
        }

        $paidIds = collect($products)->filter(fn ($p) => empty($p['is_gift']))
            ->pluck('product_id')->filter()->all();
        $paidProducts = $paidIds
            ? Product::whereIn('id', $paidIds)->where('gift_max', '>', 0)->get()
            : collect();

        $allowedGiftIds = [];
        $maxGifts = 0;
        foreach ($paidProducts as $p) {
            $ids = is_array($p->gift_product_ids) ? $p->gift_product_ids : [];
            $allowedGiftIds = array_merge($allowedGiftIds, $ids);
            // Per-copy gifts scale with the quantity bought; whole-order gifts are fixed.
            $paidLine = collect($products)->firstWhere('product_id', $p->id);
            $paidQty = (int) ($paidLine['order_quantity'] ?? 1);
            $mult = ($p->gift_per_copy ?? true) ? max(1, $paidQty) : 1;
            $maxGifts += (int) $p->gift_max * $mult;
        }
        $allowedGiftIds = array_map('intval', $allowedGiftIds);

        $giftCount = 0;
        foreach ($products as &$line) {
            if (empty($line['is_gift'])) {
                continue;
            }
            $gid = (int) ($line['product_id'] ?? 0);
            $qty = (int) ($line['order_quantity'] ?? 1);
            $giftCount += $qty;
            $gp = $gid ? Product::find($gid) : null;

            $valid = $gp
                && in_array($gid, $allowedGiftIds, true)
                && (int) $gp->quantity >= $qty
                && $giftCount <= $maxGifts;

            if ($valid) {
                // A gift is priced like any other line — it is cancelled out by an equal
                // discount in storeOrder, so the invoice shows what the gift is worth instead
                // of a bare ৳0 while the customer still pays nothing for it.
                $priced = $this->resolveLineItem($line) ?: $gp;
                $line['unit_price'] = (float) ($priced->sale_price ?: $priced->price);
                $line['subtotal']   = $this->calculateEachItemTotal($priced, $qty);
            } else {
                // Not a legitimate gift → drop the flag AND re-price it from the database.
                // The client sends gift lines at price 0, so merely unsetting the flag would
                // hand the book over free (e.g. by removing the main book that earned it).
                unset($line['is_gift']);
                if ($gp) {
                    $real = (float) ($gp->sale_price > 0 ? $gp->sale_price : $gp->price);
                    $line['unit_price'] = $real;
                    $line['subtotal']   = $real * $qty;
                }
            }
        }
        unset($line);

        return $products;
    }

    /**
     * Store order
     *
     * @param $request
     * @param $settings
     * @return LengthAwarePaginator|JsonResponse|Collection|mixed
     * @throws Exception
     */
    public function storeOrder($request, $settings): mixed
    {
        $this->guardChallengeOrder($request);
        $request['tracking_number'] = $this->generateTrackingNumber();
        // $request->merge([
        //     'payable'         => $request['paid_total'], // amount to be paid through paymentGateway
        //     'wallet_currency' => 0
        // ]);

        $fullWalletOrCODPayment = $request?->isFullWalletPayment ? PaymentGatewayType::FULL_WALLET_PAYMENT : PaymentGatewayType::CASH_ON_DELIVERY;
        $payment_gateway_type = !empty($request->payment_gateway) ? $request->payment_gateway : $fullWalletOrCODPayment;

        switch ($payment_gateway_type) {
            case PaymentGatewayType::CASH_ON_DELIVERY:
                $request['order_status'] = OrderStatus::PENDING;
                $request['payment_status'] = PaymentStatus::CASH_ON_DELIVERY;
                break;

            case PaymentGatewayType::CASH:
                $request['order_status'] = OrderStatus::PENDING;
                $request['payment_status'] = PaymentStatus::CASH;
                break;

                // case PaymentGatewayType::FULL_WALLET_PAYMENT:
                //     $request['order_status'] = OrderStatus::PROCESSING;
                //     $request['payment_status'] = PaymentStatus::WALLET;
                //     break;

            default:
                $request['order_status'] = OrderStatus::PENDING;
                $request['payment_status'] = PaymentStatus::PENDING;
                break;
        }

        $useWalletPoints = isset($request->use_wallet_points) ? $request->use_wallet_points : false;
        if ($request->user() && $request->user()->hasPermissionTo(Permission::SUPER_ADMIN) && isset($request['customer_id'])) {
            $request['customer_id'] =  $request['customer_id'];
        } else {
            $request['customer_id'] = $request->user()->id ?? null;
        }
        try {
            $user = User::findOrFail($request['customer_id']);
            if ($user) {
                $request['customer_name'] = $user->name;
            }
        } catch (Exception $e) {
            $user = null;
        }

        if (!$user) {
            $settings = Settings::getData($request->language);
            if (isset($settings->options['guestCheckout']) && !$settings->options['guestCheckout']) {
                throw new AuthorizationException(NOT_AUTHORIZED);
            }
        }
        $request['products'] = $this->guardGifts($request['products']);
        $request['amount'] = $this->calculateSubtotal($request['products']);
        // MRP subtotal (regular price, ignoring sale_price) — a PERCENTAGE coupon discounts
        // the MAIN price, not the already-reduced sale price.
        $mrpAmount = $this->calculateMrpSubtotal($request['products']);

        // Gifts are charged in the subtotal above and handed straight back as an equal
        // discount further down, so the paperwork shows the real value of the gift while the
        // payable total is unchanged. Must be computed before `is_gift` is stripped below. It
        // is applied last, after every rounding step, so the two figures cancel to the taka.
        $giftValue = 0;
        $mrpGiftValue = 0;
        foreach ($request['products'] as $line) {
            if (empty($line['is_gift'])) {
                continue;
            }
            $gift = $this->resolveLineItem($line);
            if ($gift) {
                $giftValue += $this->calculateEachItemTotal($gift, $line['order_quantity']);
                $mrpGiftValue += $this->calculateEachItemMrpTotal($gift, $line['order_quantity']);
            }
        }
        // SECURITY: order create is a PUBLIC endpoint (guest checkout), so a shopper must
        // never hand-pick their own discount. For everyone but an authenticated admin/staff the
        // discount is rebuilt from server-validated sources only (coupon, gift, pre-order
        // full-pay) further down; the client-sent figure is ignored. Admin/POS keep manual control.
        $discountUser = $request->user();
        $isPrivilegedOrder = $discountUser && (
            $discountUser->hasPermissionTo(Permission::SUPER_ADMIN)
            || $discountUser->hasPermissionTo(Permission::STORE_OWNER)
            || $discountUser->hasPermissionTo(Permission::STAFF)
        );
        $request['discount'] = $isPrivilegedOrder ? (float) ($request['discount'] ?? 0) : 0.0;

        // `is_gift` is only needed for the gift pricing above; strip it now so it
        // doesn't leak into the order_product pivot insert (extra column → 21S01).
        $request['products'] = array_map(function ($p) {
            unset($p['is_gift']);
            return $p;
        }, $request['products']);

        // ---------------------------------------------------------------- PRE-ORDER
        // A cart holding any pre-order book plays by pre-order rules: the window and the
        // copy cap must still allow it, cash-on-delivery is off, and the whole order needs
        // an advance. Paying 100% up front earns an extra 5%.
        $cartIds = collect($request['products'])->pluck('product_id')->filter()->all();
        $preorderBooks = $cartIds ? Product::whereIn('id', $cartIds)->where('is_preorder', true)->get() : collect();
        $preorderFull = filter_var($request['preorder_full'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $preorderPct = 50;

        if ($preorderBooks->isNotEmpty()) {
            foreach ($preorderBooks as $book) {
                if ($book->preorder_until && Carbon::parse($book->preorder_until)->isPast()) {
                    throw new MarvelException("'{$book->name}' — প্রি-অর্ডারের সময় শেষ হয়ে গেছে।");
                }
                $line = collect($request['products'])->firstWhere('product_id', $book->id);
                $want = (int) ($line['order_quantity'] ?? 1);
                if ($book->preorder_limit !== null && ((int) $book->preorder_count + $want) > (int) $book->preorder_limit) {
                    $left = max(0, (int) $book->preorder_limit - (int) $book->preorder_count);
                    throw new MarvelException("'{$book->name}' — প্রি-অর্ডার কোটা প্রায় শেষ, আর {$left} কপি নেওয়া যাবে।");
                }
            }

            $gateway = $request['payment_gateway'] ?? null;
            if (in_array($gateway, [PaymentGatewayType::CASH_ON_DELIVERY, PaymentGatewayType::CASH, 'CASH_ON_DELIVERY', 'CASH'], true)) {
                throw new MarvelException('প্রি-অর্ডারের বইয়ে ক্যাশ-অন-ডেলিভারি নেই — কমপক্ষে ৫০% অগ্রিম দিতে হবে।');
            }

            $preorderPct = (int) ($preorderBooks->max('preorder_advance_pct') ?: 50);
            if ($preorderFull) {
                // Full-pay discount is per book: each pre-order book carries its own
                // preorder_full_pay_discount_pct (default 5, 0 = off for that book).
                $fullPayDiscount = 0;
                foreach ($preorderBooks as $book) {
                    $pct = (int) ($book->preorder_full_pay_discount_pct ?? 5);
                    if ($pct <= 0) {
                        continue;
                    }
                    $line = collect($request['products'])->firstWhere('product_id', $book->id);
                    $qty = (int) ($line['order_quantity'] ?? 1);
                    $unit = (float) ($book->sale_price ?: $book->price);
                    $fullPayDiscount += $unit * $qty * $pct / 100;
                }
                $request['discount'] = round((float) ($request['discount'] ?? 0) + $fullPayDiscount);
            }
        }

        if (isset($request->coupon_id)) {
            try {
                $coupon = Coupon::findOrFail($request['coupon_id']);
                // A membership card (coupon bound to a user) only discounts that member's
                // own order — checked here too, so posting the coupon_id can't bypass verify.
                if (!empty($coupon->user_id) && (int) $coupon->user_id !== (int) ($request->user()->id ?? 0)) {
                    throw new MarvelException('This membership card belongs to another customer.');
                }
                // Re-validate the coupon against the ACTUAL recalculated cart amount. The shopper
                // may have removed books after applying it, and an unapproved/expired coupon (or
                // one under its minimum) must not keep discounting the order.
                $now = now();
                $notStarted = !empty($coupon->active_from) && $now->lt(\Illuminate\Support\Carbon::parse($coupon->active_from));
                $expired    = !empty($coupon->expire_at)   && $now->gt(\Illuminate\Support\Carbon::parse($coupon->expire_at));
                if (empty($coupon->is_approve) || $notStarted || $expired) {
                    throw new MarvelException('এই কুপনটি এখন আর প্রযোজ্য নয়।');
                }
                $minCart = (float) ($coupon->minimum_cart_amount ?? 0);
                if ($minCart > 0 && (float) $request['amount'] < $minCart) {
                    throw new MarvelException('এই কুপন ব্যবহার করতে অন্তত ৳' . round($minCart) . ' এর বই লাগবে।');
                }
                // `+=`, not `=`: a coupon stacks on top of the gift and full-pay discounts
                // instead of wiping them out (which would charge the customer for the gift).
                // The coupon is calculated on the paid goods only, so a gift can never inflate
                // a percentage coupon.
                // Percentage coupons discount the MAIN (MRP) price; fixed coupons stay a flat taka.
                // Clamp so the discount never exceeds the paid goods' actual (sale) value → total >= 0.
                $paidGoods = (float) $request['amount'] - $giftValue;
                $couponBase = $coupon->type === CouponType::PERCENTAGE_COUPON
                    ? max(0, $mrpAmount - $mrpGiftValue)
                    : $paidGoods;
                $request['discount'] += min($this->calculateDiscount($coupon, $couponBase), $paidGoods);
            } catch (Exception $th) {
                throw $th;
            }
        }

        if (isset($coupon) && $coupon->type === CouponType::FREE_SHIPPING_COUPON) {
            $request['delivery_fee'] = 0;
        } else {
            // SECURITY: never let a client-sent negative delivery fee credit the total.
            $request['delivery_fee'] = max(0, (float) ($request['delivery_fee'] ?? 0));
        }
        // Per-vendor delivery — recomputed server-side, NEVER trusted from the client, and ADDED
        // on top of the order-level zone fee (after the free-shipping branch, so free shipping
        // waives only the main store's own fee). Main-store (super-admin-owned) shops add nothing.
        // INVARIANT: the frontends post delivery_fee = the ORDER-LEVEL fee only; the vendor portion
        // is added here, so it must never already be folded into the posted delivery_fee.
        $request['delivery_fee'] = round($request['delivery_fee'] + $this->vendorDeliveryCharge($request), 2);

        // Hand the gift back, unrounded, so it cancels the gift line in `amount` exactly.
        $request['discount'] += $giftValue;

        // SECURITY: sales_tax arrives straight from the client and was never validated or clamped,
        // so a negative value ('sales_tax': -4999) dragged the whole total below the goods price —
        // letting an attacker pay ~1 taka for any order. Never let it credit the bill. (This store
        // computes no server-side tax today; when it does, recompute the figure here instead.)
        $request['sales_tax'] = max(0, (float) ($request['sales_tax'] ?? 0));

        // The total is computed server-side so the client can't understate the bill.
        $computedTotal = round($request['amount'] + $request['sales_tax'] + $request['delivery_fee'] - $request['discount'], 2);
        $request['total'] = $computedTotal;
        // #B — respect a partial advance. The POS/admin can collect only part of the bill up
        // front; that smaller figure is the real paid_total and the rest stays due. The advance
        // is signalled explicitly with `advance_paid` (never inferred from paid_total, which for
        // a normal order equals the total and would misfire on a manual adjustment). Otherwise
        // fall back to the full total — Pickbazar's settled-COD convention, so an ordinary order
        // isn't flagged as owing money.
        // advance_paid (POS partial payment) may only be set by staff/admin — a normal customer
        // must pay the full total, never signal a smaller "already paid" figure from the client.
        $isStaffCaller = $user && (
            $user->hasPermissionTo(Permission::SUPER_ADMIN)
            || $user->hasPermissionTo(Permission::STORE_OWNER)
            || $user->hasPermissionTo(Permission::STAFF)
        );
        $advance = ($isStaffCaller && isset($request['advance_paid'])) ? round((float) $request['advance_paid'], 2) : null;
        $request['paid_total'] = ($advance !== null && $advance > 0 && $advance < $computedTotal)
            ? $advance
            : $computedTotal;
        if (($useWalletPoints || $request->isFullWalletPayment) && $user) {
            $wallet = $user->wallet;
            $amount = null;
            if (isset($wallet->available_points)) {
                $amount = round($request['paid_total'], 2) - $this->walletPointsToCurrency($wallet->available_points);
            }

            if ($amount !== null && $amount <= 0) {
                $request['order_status'] = OrderStatus::COMPLETED;
                $request['payment_gateway'] = PaymentGatewayType::FULL_WALLET_PAYMENT;
                $request['payment_status'] = PaymentStatus::SUCCESS;
                $order = $this->createOrder($request);
                $this->storeOrderWalletPoint($request['paid_total'], $order->id);
                $this->manageWalletAmount($request['paid_total'], $user->id);
                return $order;
            }
        } else {
            $amount = round($request['paid_total'], 2);
        }

        $order = $this->createOrder($request);

        if ($preorderBooks->isNotEmpty()) {
            $this->stampPreorder($order, $request['products'], $preorderPct, $preorderFull);
        }

        // The customer made it through — close their open abandoned-checkout row (#20).
        if ($user) {
            DB::table('checkout_intents')
                ->where('customer_id', $user->id)
                ->where('converted', false)
                ->update(['converted' => true, 'order_id' => $order->id, 'updated_at' => now()]);
        }

        // A restock request is settled the moment they buy the book — that frees the
        // customer's quota back up (#12).
        if ($user && $cartIds) {
            DB::table('restock_requests')
                ->where('customer_id', $user->id)
                ->whereIn('product_id', $cartIds)
                ->where('status', 'confirmed')
                ->update(['status' => 'ordered', 'updated_at' => now()]);
        }

        if (($useWalletPoints || $request->isFullWalletPayment) && $user) {
            $this->storeOrderWalletPoint(round($request['paid_total'], 2) - $amount, $order->id);
            $this->manageWalletAmount(round($request['paid_total'], 2), $user->id);
        }

        $eligible = $this->checkOrderEligibility();
        if (!$eligible) {
            throw new MarvelBadRequestException('COULD_NOT_PROCESS_THE_ORDER_PLEASE_CONTACT_WITH_THE_ADMIN');
        }
        // Payment routing for online orders.
        if (!in_array($order->payment_gateway, [
            PaymentGatewayType::CASH, PaymentGatewayType::CASH_ON_DELIVERY, PaymentGatewayType::FULL_WALLET_PAYMENT
        ])) {
            $payLinkGateways = ['bkash', 'nagad', 'rocket', 'upay', 'tap', 'cellfin'];
            if (in_array(strtolower((string) $order->payment_gateway), $payLinkGateways, true)) {
                // BD mobile-money gateways pay through the /pay/{token} screen, not a
                // Stripe payment-intent. (Pre-orders are already stamped above.)
                $this->stampPayLink($order);
            } else {
                // Card / Stripe-style gateways use the payment-intent redirect flow.
                // The `creating` hook renumbered tracking_number to the 25000+ sequence,
                // so point the intent lookup at the order's real tracking number.
                $request['tracking_number'] = $order->tracking_number;
                $order['payment_intent'] = $this->processPaymentIntent($request, $settings);
            }
        }


        if ($payment_gateway_type === PaymentGatewayType::CASH_ON_DELIVERY || $payment_gateway_type === PaymentGatewayType::CASH) {
            $this->orderStatusManagementOnCOD($order, OrderStatus::PENDING, OrderStatus::PROCESSING);
        } else {
            $this->orderStatusManagementOnPayment($order, OrderStatus::PENDING, PaymentStatus::PENDING);
        }

        event(new OrderProcessed($order));

        return $order;
    }


    /**
     * updateOrder
     *
     * @param  mixed $request
     * @return void
     */
    public function updateOrder($request)
    {
        $order = Order::findOrFail($request->id);
        $user = $request->user();
        if (isset($order->shop_id)) {
            if ($this->hasPermission($user, $order->shop_id)) {
                return $this->changeOrderStatus($order, $request->order_status);
            }
        } else if ($user->hasPermissionTo(Permission::SUPER_ADMIN)) {
            return $this->changeOrderStatus($order, $request->order_status);
        } else {
            throw new AuthorizationException(NOT_AUTHORIZED);
        }
    }

    /**
     * storeOrderWalletPoint
     *
     * @param  mixed $amount
     * @param  mixed $order_id
     * @return void
     */
    /**
     * An order redeeming a 1-minute-challenge coupon plays by the challenge's rules.
     *
     * verifyCoupon already checks this at checkout, but the cart can be edited after the
     * coupon is verified — this is the point of no return, so it is checked again here.
     */
    protected function guardChallengeOrder($request): void
    {
        if (empty($request['coupon_id'])) {
            return;
        }
        $isChallenge = \Marvel\Database\Models\ChallengeRun::where('coupon_id', $request['coupon_id'])->exists();
        if (!$isChallenge) {
            return;
        }
        foreach ((array) ($request['products'] ?? []) as $product) {
            if ((int) ($product['order_quantity'] ?? 1) > 1) {
                throw new MarvelException('চ্যালেঞ্জের ছাড়ে প্রতিটি বইয়ের ১ কপির বেশি নেওয়া যাবে না।');
            }
        }
    }

    public function storeOrderWalletPoint($amount, $order_id)
    {
        if ($amount > 0) {
            OrderWalletPoint::create(['amount' =>  $amount, 'order_id' =>  $order_id]);
        }
    }


    /**
     * manageWalletAmount
     *
     * @param  mixed $total
     * @param  mixed $customer_id
     * @return void
     */
    public function manageWalletAmount($total, $customer_id)
    {
        try {
            $total = $this->currencyToWalletPoints($total);
            $wallet = Wallet::where('customer_id', $customer_id)->first();
            $available_points = $wallet->available_points - $total >= 0 ? $wallet->available_points - $total : 0;
            if ($available_points === 0) {
                $spend = $wallet->points_used + $wallet->available_points;
            } else {
                $spend = $wallet->points_used + $total;
            }
            $wallet->available_points = $available_points;
            $wallet->points_used = $spend;
            $wallet->save();
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * @param $request
     * @return array|LengthAwarePaginator|Collection|mixed
     */
    protected function createOrder($request)
    {
        try {
            $orderInput = $request->only($this->dataArray);
            $order = $this->create($orderInput);
            // IndoBangla: record who placed the order so the admin board can label it "by admin"
            // vs "by customer". A creator holding an admin/staff/store-owner permission means the
            // order was cut from the dashboard (POS), not the storefront. Guests/customers never
            // match, so their orders stay "by customer".
            try {
                $creator = $request->user();
                if ($creator && (
                    $creator->hasPermissionTo(Permission::SUPER_ADMIN)
                    || $creator->hasPermissionTo(Permission::STORE_OWNER)
                    || $creator->hasPermissionTo(Permission::STAFF)
                )) {
                    $ops = (array) ($order->ops_meta ?? []);
                    $ops['created_by_name'] = $creator->name;
                    $order->ops_meta = $ops;
                    $order->save();
                }
            } catch (\Throwable $e) {
                // creator attribution is cosmetic — never let it break order creation
            }
            $products = $this->processProducts($request['products'], $request['customer_id'], $order);
            $order->products()->attach($products);
            Order::commitStock($order); // IndoBangla: reserve book stock on placement
            $this->createChildOrder($order->id, $request);
            //  $this->calculateShopIncome($order);
            $invoiceData = $this->createInvoiceDataForEmail($request, $order);
            $customer = $request->user() ?? null;
            event(new OrderCreated($order, $invoiceData, $customer));
            return $order;
        } catch (Exception $e) {
            throw $e;
        }
    }
    /**
     * This function creates an array of data for an email invoice, including order information,
     * settings, translated text, and URL.
     * 
     * @param request This is an HTTP request object that contains information about the current
     * request being made to the server. It is used to retrieve data from the request, such as the
     * language and whether the text should be displayed right-to-left (RTL).
     * @param order The order object that contains information about the order, such as the customer
     * details, order items, and total amount.
     * 
     * @return array An array containing order data, settings data, translated text, RTL status,
     * language, and a URL.
     */
    public function createInvoiceDataForEmail($request, $order): array
    {
        $language = $request->language ?? DEFAULT_LANGUAGE;
        $isRTL = $request->is_rtl ?? false;

        $translatedText = $this->formatInvoiceTranslateText($request->invoice_translated_text);
        $settings = Settings::getData($language);
        return [
            'order'           => $order,
            'settings'        => $settings,
            'translated_text' => $translatedText,
            'is_rtl'          => $isRTL,
            'language'        => $language,
            'url' => config('shop.shop_url') . '/orders/' . $order->tracking_number
        ];
    }

    /**
     * calculateShopIncome
     *
     * @param  mixed $parent_order
     * @return void
     */
    protected function calculateShopIncome($parent_order)
    {
        foreach ($parent_order->children as  $order) {
            $balance = Balance::where('shop_id', '=', $order->shop_id)->first();
            $adminCommissionRate = $balance->admin_commission_rate;
            $shop_earnings = ($order->total * (100 - $adminCommissionRate)) / 100;
            $balance->total_earnings = $balance->total_earnings + $shop_earnings;
            $balance->current_balance = $balance->current_balance + $shop_earnings;
            $balance->save();
        }
    }

    /**
     * processProducts
     *
     * @param  mixed $products
     * @param  mixed $customer_id
     * @param  mixed $order
     * @return void
     */
    protected function processProducts($products, $customer_id, $order)
    {
        foreach ($products as $key => $product) {
            if (!isset($product['variation_option_id'])) {
                $product['variation_option_id'] = null;
                $products[$key] = $product;
            }
            try {
                if ($order->parent_id === null) {
                    $productData = Product::with('digital_file')->findOrFail($product['product_id']);

                    // if rental product
                    $isRentalProduct = $productData->is_rental;
                    if ($isRentalProduct) {
                        $this->processRentalProduct($product, $order->id);
                    }


                    if ($productData->product_type === ProductType::SIMPLE) {
                        $this->storeOrderedFile($productData, $product['order_quantity'], $customer_id, $order->tracking_number);
                    } else if ($productData->product_type === ProductType::VARIABLE) {
                        $variation_option = Variation::with('digital_file')->findOrFail($product['variation_option_id']);
                        $this->storeOrderedFile($variation_option, $product['order_quantity'], $customer_id, $order->tracking_number);
                    }
                }
            } catch (Exception $e) {
                throw $e;
            }
        }
        return $products;
    }


    /**
     * storeOrderedFile
     *
     * @param  mixed $item
     * @param  mixed $order_quantity
     * @param  mixed $customer_id
     * @return void
     */
    public function storeOrderedFile($item, $order_quantity, $customer_id, $order_tracking_number)
    {
        if ($item->is_digital) {
            $digital_file = $item->digital_file;
            for ($i = 0; $i < $order_quantity; $i++) {
                OrderedFile::create([
                    'purchase_key'    => Str::random(16),
                    'digital_file_id' => $digital_file->id,
                    'customer_id'     => $customer_id,
                    'tracking_number'  => $order_tracking_number
                ]);
            }
        }
    }

    /**
     * processRentalProduct
     *
     * @param  mixed $product
     * @param  mixed $orderId
     * @return void
     */
    protected function processRentalProduct($product, $orderId)
    {
        $product['from'] = Carbon::parse($product['from']);
        $product['to'] = Carbon::parse($product['to']);
        $product['booking_duration'] = $product['from']->diffAsCarbonInterval($product['to']);
        $product['order_id'] = $orderId;
        $product['language'] = $orderId;
        unset($product['unit_price']);
        unset($product['subtotal']);
        try {
            if ($product['variation_option_id'] === null) {
                $productData = Product::findOrFail($product['product_id']);
                unset($product['variation_option_id']);
                $product['language'] = $productData->language;
                if (TRANSLATION_ENABLED) {
                    $this->processAllTranslatedProducts($productData, $product);
                } else {
                    $productData->availabilities()->create($product);
                }
            } else {
                $variation_option = Variation::findOrFail($product['variation_option_id']);
                unset($product['variation_option_id']);
                if (TRANSLATION_ENABLED) {
                    $this->processAllTranslatedVariations($variation_option, $product);
                } else {
                    $variation_option->availabilities()->create($product);
                }
            }
        } catch (\Throwable $th) {
            throw new ModelNotFoundException(NOT_FOUND);
        }
    }

    /**
     * processAllTranslatedProducts
     *
     * @param  mixed $product
     * @param  mixed $orderedItem
     * @return void
     */
    public function processAllTranslatedProducts($product, $orderedItem)
    {
        $translatedProducts = Product::where('sku', $product->sku)->get();
        foreach ($translatedProducts as $translatedProduct) {
            $orderedItem['language'] = $translatedProduct->language;
            $orderedItem['product_id'] = $translatedProduct->id;
            $translatedProduct->availabilities()->create($orderedItem);
        }
    }

    /**
     * processAllTranslatedVariations
     *
     * @param  mixed $variation
     * @param  mixed $orderedItem
     * @return void
     */
    public function processAllTranslatedVariations($variation, $orderedItem)
    {
        $translatedVariations = Variation::where('sku', $variation->sku)->get();
        foreach ($translatedVariations as $translatedVariation) {
            $orderedItem['language'] = $translatedVariation->language;
            $translatedVariation->availabilities()->create($orderedItem);
        }
    }


    /**
     * createChildOrder
     *
     * @param  mixed $id
     * @param  mixed $request
     * @return void
     * @throws Exception
     */
    public function createChildOrder($id, $request): void
    {
        $products = $request->products;
        $productsByShop = [];
        $language = $request->language ?? DEFAULT_LANGUAGE;

        foreach ($products as $key => $cartProduct) {
            $product = Product::findOrFail($cartProduct['product_id']);
            $productsByShop[$product->shop_id][] = $cartProduct;
        }

        foreach ($productsByShop as $shop_id => $cartProduct) {
            $amount = array_sum(array_column($cartProduct, 'subtotal'));
            $orderInput = [
                'tracking_number'  => $this->generateTrackingNumber(),
                'shop_id'          => $shop_id,
                'order_status'     => $request->order_status,
                'payment_status'   => $request->payment_status,
                'customer_id'      => $request->customer_id,
                'shipping_address' => $request->shipping_address,
                'billing_address'  => $request->billing_address,
                'customer_contact' => $request->customer_contact,
                'customer_name'    => $request->customer_name,
                'delivery_time'    => $request->delivery_time,
                'delivery_fee'     => 0,
                'sales_tax'        => 0,
                'discount'         => 0,
                'parent_id'        => $id,
                'amount'           => $amount,
                'total'            => $amount,
                'paid_total'       => $amount,
                'language'         => $language,
                "payment_gateway"  => $request->payment_gateway,
            ];

            $order = $this->create($orderInput);
            $order->products()->attach($this->processProducts($cartProduct,  $request['customer_id'],  $order));
            // Stock is already reserved on the PARENT order in createOrder(); committing again
            // for each child re-decremented the same books, so every order dropped stock twice
            // while a void only released the parent's share. Parent commit is the single source.
            event(new OrderReceived($order));
        }
    }

    /**
     * Helper method to generate unique tracking number
     *
     * @return string
     * @throws Exception
     */
    public function generateTrackingNumber(): string
    {
        $today = date('Ymd');
        $trackingNumbers = Order::where('tracking_number', 'like', $today . '%')->pluck('tracking_number');

        do {
            $trackingNumber = $today . random_int(100000, 999999);
        } while ($trackingNumbers->contains($trackingNumber));

        return $trackingNumber;
    }

    public function checkOrderEligibility(): bool
    {
        $settings = Settings::getData();
        $useMustVerifyLicense = isset($settings->options['app_settings']['trust']) ? $settings->options['app_settings']['trust'] : false;
        return $useMustVerifyLicense;
    }
}
