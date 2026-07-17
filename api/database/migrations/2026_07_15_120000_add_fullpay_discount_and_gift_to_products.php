<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Feature 1 — per-product full-pay discount:
 *   preorder_full_pay_discount_pct : % off when a pre-order is paid 100% up front.
 *   Default 5. Set to 0 to switch the discount off for that product.
 *
 * Feature 2 — gift with product:
 *   gift_product_ids : JSON array of product ids the buyer may pick a free gift from.
 *   gift_max         : how many gifts the buyer may choose (0 = feature off).
 *
 * Run only this file:
 *   php artisan migrate --path=database/migrations/2026_07_15_120000_add_fullpay_discount_and_gift_to_products.php --force
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'preorder_full_pay_discount_pct')) {
                $table->unsignedTinyInteger('preorder_full_pay_discount_pct')->default(5)->after('preorder_advance_pct');
            }
            if (!Schema::hasColumn('products', 'gift_product_ids')) {
                $table->json('gift_product_ids')->nullable()->after('preorder_full_pay_discount_pct');
            }
            if (!Schema::hasColumn('products', 'gift_max')) {
                $table->unsignedTinyInteger('gift_max')->default(0)->after('gift_product_ids');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['preorder_full_pay_discount_pct', 'gift_product_ids', 'gift_max']);
        });
    }
};
