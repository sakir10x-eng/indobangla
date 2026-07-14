<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-order settings live on the product: it can be opened for pre-order until a date,
 * optionally capped to a number of copies (null = unlimited, stock is not deducted),
 * and it always demands an advance (50% by default; paying 100% earns a bonus discount).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_preorder')) {
                $table->boolean('is_preorder')->default(false)->index();
            }
            if (!Schema::hasColumn('products', 'preorder_until')) {
                $table->dateTime('preorder_until')->nullable();
            }
            if (!Schema::hasColumn('products', 'preorder_limit')) {
                $table->unsignedInteger('preorder_limit')->nullable();   // null = unlimited
            }
            if (!Schema::hasColumn('products', 'preorder_count')) {
                $table->unsignedInteger('preorder_count')->default(0);   // copies already pre-ordered
            }
            if (!Schema::hasColumn('products', 'preorder_advance_pct')) {
                $table->unsignedTinyInteger('preorder_advance_pct')->default(50);
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'is_preorder', 'preorder_until', 'preorder_limit', 'preorder_count', 'preorder_advance_pct',
            ]);
        });
    }
};
