<?php

namespace Marvel\Traits;

use Illuminate\Support\Arr;
use Marvel\Database\Models\Product;
use Marvel\Database\Models\Shop;
use Marvel\Enums\Permission;

/**
 * Per-vendor (per-shop) delivery charge, shared by checkout-verify and order creation so the
 * figure the customer is shown always equals the figure the server stores.
 *
 * The store already charges ONE order-level zone fee (Dhaka 60 / outside 120). On top of that,
 * every DISTINCT non-main-store vendor whose products are in the cart adds its OWN zone charge
 * once. Main-store shops (owned by a super-admin) are skipped — they ride the order-level fee.
 */
trait VendorDeliveryTrait
{
    /** Inside-Dhaka detection from the shipping/billing address haystack — the single source of
     *  truth for BOTH the order-level zone charge and the per-vendor charge, so they can't disagree. */
    public function isInsideDhaka($request): bool
    {
        $addr = $request['shipping_address'] ?? $request['billing_address'] ?? [];
        if (!is_array($addr)) {
            $addr = (array) $addr;
        }
        $hay = mb_strtolower(trim(implode(' ', [
            $addr['city'] ?? '',
            $addr['state'] ?? '',
            $addr['street_address'] ?? '',
            $addr['address'] ?? '',
        ])));
        return $hay !== '' && (str_contains($hay, 'dhaka') || str_contains($hay, 'ঢাকা'));
    }

    /**
     * Additive per-vendor delivery charge (once per distinct non-main-store vendor in the cart).
     * Default 60 (Dhaka) / 120 (outside) per vendor, overridable per shop via
     * shops.settings.deliveryCharge = { dhaka, outside }. Returns 0 when the cart is only
     * main-store products. Computed server-side ONLY — never trusted from the client.
     */
    public function vendorDeliveryCharge($request): float
    {
        try {
            $productIds = array_values(array_filter(Arr::pluck($request['products'] ?? [], 'product_id')));
            if (empty($productIds)) {
                return 0;
            }
            $shopIds = Product::whereIn('id', $productIds)->pluck('shop_id')->unique()->filter();
            if ($shopIds->isEmpty()) {
                return 0;
            }
            $inside = $this->isInsideDhaka($request);
            $sum = 0.0;
            foreach (Shop::with('owner')->whereIn('id', $shopIds)->get() as $shop) {
                // Main-store (super-admin-owned) shop → order-level fee only, never a vendor add.
                if ($shop->owner && $shop->owner->hasPermissionTo(Permission::SUPER_ADMIN)) {
                    continue;
                }
                $dc = (array) (($shop->settings['deliveryCharge'] ?? []) ?: []);
                $dhaka   = isset($dc['dhaka'])   && $dc['dhaka']   !== '' ? (float) $dc['dhaka']   : 60;
                $outside = isset($dc['outside']) && $dc['outside'] !== '' ? (float) $dc['outside'] : 120;
                $sum += $inside ? $dhaka : $outside;
            }
            return round($sum, 2);
        } catch (\Throwable $e) {
            // Never break checkout over the vendor add-on; fall back to no extra charge.
            return 0;
        }
    }
}
