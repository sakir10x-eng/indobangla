<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #7 — conversion-rate pricing. `mrp` is the book's original cover price and
 * `book_origin` marks it Indian vs Bangladeshi; the selling price is derived as
 * mrp × conversion-rate (rate depends on origin + admin scope overrides), so the
 * admin can re-price whole catalogues from one panel instead of editing each book.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'mrp')) {
                    $table->double('mrp')->nullable();
                }
                if (!Schema::hasColumn('products', 'book_origin')) {
                    $table->string('book_origin')->nullable()->index(); // 'indian' | 'bd'
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'mrp')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('mrp');
            });
        }
        if (Schema::hasColumn('products', 'book_origin')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('book_origin');
            });
        }
    }
};
