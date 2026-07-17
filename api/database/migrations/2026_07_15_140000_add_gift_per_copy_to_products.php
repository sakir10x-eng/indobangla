<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * gift_per_copy:
 *   true  (default) — gifts scale with quantity: 1 copy → gift_max gifts, 2 copies → 2×gift_max.
 *   false           — a fixed number of gifts for the whole order regardless of quantity.
 *
 * Run only this file:
 *   php artisan migrate --path=database/migrations/2026_07_15_140000_add_gift_per_copy_to_products.php --force
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'gift_per_copy')) {
                $table->boolean('gift_per_copy')->default(true)->after('gift_max');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('gift_per_copy');
        });
    }
};
