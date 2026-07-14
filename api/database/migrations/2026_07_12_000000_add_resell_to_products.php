<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode A — customer book resell. A resell listing is a normal Product flagged
 * with `is_resell`; `resell_meta` holds the seller, condition, images, moderation
 * status, delivery choice and buyer. Reusing the products table lets the existing
 * cart / checkout / order flow handle resold books unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'is_resell')) {
                    $table->boolean('is_resell')->default(false)->index();
                }
                if (!Schema::hasColumn('products', 'resell_meta')) {
                    $table->json('resell_meta')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'is_resell')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('is_resell');
            });
        }
        if (Schema::hasColumn('products', 'resell_meta')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('resell_meta');
            });
        }
    }
};
