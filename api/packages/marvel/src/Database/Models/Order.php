<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Marvel\Traits\TranslationTrait;

class Order extends Model
{
    use SoftDeletes;
    use TranslationTrait;


    protected $table = 'orders';

    public $guarded = [];

    protected $casts = [
        'shipping_address'    => 'json',
        'billing_address'     => 'json',
        'payment_intent_info' => 'json',
        'ops_meta'            => 'json',
        // Lifecycle markers, deliberately not order statuses — see the
        // add_order_lifecycle_columns migration for why.
        'locked_at'           => 'datetime',   // "সম্পন্ন": return window over, no more edits
        'archived_at'         => 'datetime',   // out of the working list, not deleted
    ];

    protected $hidden = [
        //        'created_at',
        'updated_at',
        'deleted_at'
    ];

    protected static function boot()
    {
        parent::boot();
        // Order by created_at desc
        static::addGlobalScope('order', function (Builder $builder) {
            $builder->orderBy('created_at', 'desc');
        });

        /**
         * A locked ("সম্পন্ন") order is final: delivered, return window served out, closed.
         *
         * The guard lives on the model rather than in the board's endpoints because an order can
         * be written from several directions — the ops endpoints, Marvel's own OrderController,
         * the refund flow — and a check in only some of them is not a lock. Whatever forgets to
         * ask, this still refuses.
         *
         * Two deliberate escapes: a super admin can still act (they are the ones who unlock a
         * mistake), and a request with no authenticated user is a system action — the nightly
         * sweep, a gateway callback settling money — which must not be blocked by a desk rule.
         */
        static::updating(function ($order) {
            if (!$order->getOriginal('locked_at') || $order->isDirty('locked_at')) {
                return;   // not locked, or this write IS the unlock
            }
            $user = auth()->user();
            if (!$user) {
                return;
            }
            if (!$user->getPermissionNames()->contains(\Marvel\Enums\Permission::SUPER_ADMIN)) {
                throw new \Marvel\Exceptions\MarvelException(
                    'এই অর্ডারটি সম্পন্ন হয়ে গেছে — আর পরিবর্তন করা যাবে না।'
                );
            }
        });

        // Stamp the moment an order is actually delivered — the exchange/return window
        // counts from this, and `updated_at` would move every time the order is touched.
        static::updating(function ($order) {
            if (!$order->isDirty('order_status')) {
                return;
            }
            if ($order->order_status !== 'order-completed') {
                return;
            }
            $ops = (array) ($order->ops_meta ?? []);
            if (empty($ops['delivered_at'])) {
                $ops['delivered_at'] = now()->toIso8601String();
                $order->ops_meta = $ops;
            }
        });

        // IndoBangla: give every NEW order a sequential order code starting at 25000.
        // Derived from the current max numeric code (4–7 digits) so it is self-correcting
        // and never collides with the 14-digit timestamp codes from the default checkout.
        static::creating(function ($order) {
            try {
                $max = (int) static::withTrashed()
                    ->whereRaw("tracking_number REGEXP '^[0-9]{4,7}$'")
                    ->whereRaw('CAST(tracking_number AS UNSIGNED) BETWEEN 25000 AND 9999999')
                    ->orderByRaw('CAST(tracking_number AS UNSIGNED) DESC')
                    ->value('tracking_number');
                $order->tracking_number = (string) ($max >= 25000 ? $max + 1 : 25000);
            } catch (\Throwable $e) {
                // never block order creation on numbering
            }
        });

        // IndoBangla: notify admin (Telegram/WhatsApp) about every new order.
        static::created(function ($order) {
            // IndoBangla: the customer's order number and the admin URL must be the SAME number.
            // The admin panel routes by row `id`; the customer sees `tracking_number`. Pinning
            // tracking_number to `id` makes them identical for every new order. The DB
            // AUTO_INCREMENT was bumped past the old 25000-sequence so numbers only ever go up.
            try {
                $order->tracking_number = (string) $order->id;
                $order->saveQuietly(); // quiet: no status change -> no notifier, no recursion
            } catch (\Throwable $e) {
                // fall back to the creating-hook number; never block order creation
            }
            try {
                $total = number_format((float) ($order->total ?? 0), 0);
                \Marvel\Helpers\AdminNotifier::send(
                    "🆕 <b>নতুন অর্ডার</b> #{$order->tracking_number}\n"
                    . "👤 " . ($order->customer_name ?: 'Customer') . "\n"
                    . "📞 " . ($order->customer_contact ?: '-') . "\n"
                    . "💵 ৳{$total}"
                );
            } catch (\Throwable $e) {
                // never block order creation on notification
            }

            try {
                // Finished the 1-minute challenge they started → staked points come back.
                ChallengeRun::settleForOrder($order);
            } catch (\Throwable $e) {
                // never block order creation on the challenge ledger
            }
        });

        // IndoBangla: cancelling / refunding / voiding an order releases its books back into
        // stock. Gated on ops_meta.stock_committed so orders that never reserved stock
        // (e.g. imported history) are never wrongly inflated, and release runs once.
        static::updated(function ($order) {
            try {
                if (!$order->wasChanged('order_status')) {
                    return;
                }
                // Capture the transition BEFORE the saveQuietly below: saveQuietly() re-syncs the
                // model's "original", so getOriginal('order_status') would otherwise return the new
                // value and break the cancel/void stock-release detection further down.
                $new = $order->order_status;
                $old = $order->getOriginal('order_status');
                // Timeline: stamp when each status is first reached so the board can draw a
                // Pending → Delivered progression with times. Every status change (board, agent,
                // lifecycle) flows through here. saveQuietly() → no updated-event re-loop.
                $ops  = (array) ($order->ops_meta ?? []);
                $hist = (array) ($ops['status_history'] ?? []);
                if (empty($hist[$new])) {
                    $hist[$new] = now()->toIso8601String();
                    $ops['status_history'] = $hist;
                    $order->ops_meta = $ops;
                    $order->saveQuietly();
                }
                // Void belongs here for the same reason as cancelled: the books were never
                // really sold, so the copies have to go back on the shelf.
                $cancelled = ['order-cancelled', 'order-refunded', 'order-void'];
                if (in_array($new, $cancelled) && !in_array($old, $cancelled)) {
                    $ops = (array) ($order->ops_meta ?? []);
                    if (!empty($ops['stock_committed']) && empty($ops['stock_released'])) {
                        $order->loadMissing('products');
                        foreach ($order->products as $p) {
                            $qty = (int) ($p->pivot->order_quantity ?? 0);
                            if ($qty > 0) {
                                \Marvel\Database\Models\Product::where('id', $p->id)->increment('quantity', $qty);
                                \Marvel\Database\Models\Product::where('id', $p->id)
                                    ->where('sold_quantity', '>=', $qty)
                                    ->decrement('sold_quantity', $qty);
                            }
                        }
                        $ops['stock_released'] = true;
                        $order->ops_meta = $ops;
                        $order->saveQuietly();
                    }

                    // A cancelled pre-order must give its slot back too. stampPreorder only ever
                    // increments preorder_count, so without this the book's "আর N কপি বাকি"
                    // (preorder_limit − preorder_count) counted cancelled orders forever and the
                    // quota could never recover. Gated on ops.advance (only stampPreorder sets
                    // it) and run once via preorder_released.
                    if (!empty($ops['advance']) && empty($ops['preorder_released'])) {
                        $order->loadMissing('products');
                        foreach ($order->products as $p) {
                            $qty = (int) ($p->pivot->order_quantity ?? 0);
                            if ($qty > 0 && $p->is_preorder) {
                                \Marvel\Database\Models\Product::where('id', $p->id)
                                    ->where('preorder_count', '>=', $qty)
                                    ->decrement('preorder_count', $qty);
                            }
                        }
                        $ops['preorder_released'] = true;
                        $order->ops_meta = $ops;
                        $order->saveQuietly();
                    }
                }
                \Marvel\Helpers\AdminNotifier::send(
                    "🔄 <b>অর্ডার স্ট্যাটাস</b> #{$order->tracking_number}\n"
                    . ($old ?: '-') . " → <b>{$new}</b>"
                );
            } catch (\Throwable $e) {
                // never block the status update on stock restore
            }
        });
    }

    /**
     * Reserve stock for an order once its products are attached: decrement each
     * book's quantity and bump sold_quantity. Idempotent via ops_meta.stock_committed.
     */
    public static function commitStock(self $order): void
    {
        try {
            $ops = (array) ($order->ops_meta ?? []);
            if (!empty($ops['stock_committed'])) {
                return;
            }
            $order->loadMissing('products');
            foreach ($order->products as $p) {
                $qty = (int) ($p->pivot->order_quantity ?? 0);
                if ($qty > 0) {
                    // Conditional atomic decrement: never drive stock negative, and stop two
                    // concurrent orders for the last copy from both succeeding. sold_quantity only
                    // rises by what we actually reserved so the two counters stay consistent.
                    $reserved = Product::where('id', $p->id)->where('quantity', '>=', $qty)->decrement('quantity', $qty);
                    Product::where('id', $p->id)->increment('sold_quantity', $reserved ? $qty : 0);
                }
            }
            $ops['stock_committed'] = true;
            $order->ops_meta = $ops;
            $order->saveQuietly();
        } catch (\Throwable $e) {
            // stock accounting must never break checkout
        }
    }

    // `wallet_point` rides along because `total` does NOT have the wallet contribution taken
    // off it — anything printing or collecting money needs both numbers to know what is
    // actually owed in cash. The order list only eager-loads `children`, so without this the
    // printed slip would silently ask for the full amount.
    protected $with = ['customer', 'products.variation_options', 'products.manufacturer', 'wallet_point'];

    /**
     * @return belongsToMany
     */
    public function products(): belongsToMany
    {
        return $this->belongsToMany(Product::class)
            ->withPivot('order_quantity', 'unit_price', 'subtotal', 'variation_option_id')
            ->withTimestamps();
    }

    /**
     * @return belongsTo
     */
    public function coupon(): belongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    /**
     * @return belongsTo
     */
    public function customer(): belongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /**
     * @return BelongsTo
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    /**
     * @return HasMany
     */
    public function children()
    {
        return $this->hasMany('Marvel\Database\Models\Order', 'parent_id', 'id');
    }

    /**
     * @return HasOne
     */
    public function parent_order()
    {
        return $this->hasOne('Marvel\Database\Models\Order', 'id', 'parent_id');
    }

    /**
     * @return HasOne
     */
    public function refund()
    {
        return $this->hasOne(Refund::class, 'order_id');
    }
    /**
     * @return HasOne
     */
    public function wallet_point()
    {
        return $this->hasOne(OrderWalletPoint::class, 'order_id');
    }

    /**
     * @return HasMany
     */
    public function payment_intent()
    {
        return $this->hasMany(PaymentIntent::class);
    }
    
    /**
     * @return HasMany
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
