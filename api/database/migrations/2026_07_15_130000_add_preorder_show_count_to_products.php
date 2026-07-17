<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the admin hide the "আর X কপি বাকি" (copies-left) line on a pre-order product.
 * Default 1 = show. Set to 0 to hide the remaining-copies counter for that book.
 *
 * Run only this file:
 *   php artisan migrate --path=database/migrations/2026_07_15_130000_add_preorder_show_count_to_products.php --force
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'preorder_show_count')) {
                $table->boolean('preorder_show_count')->default(true)->after('preorder_limit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('preorder_show_count');
        });
    }
};
