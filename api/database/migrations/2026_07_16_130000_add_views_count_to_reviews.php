<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "My Library" — koto bar review ta pora holo (simple total read counter).
 * Every open of the review increments this; no per-user uniqueness.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('reviews') && !Schema::hasColumn('reviews', 'views_count')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->unsignedBigInteger('views_count')->default(0)->after('rating');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('reviews', 'views_count')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropColumn('views_count');
            });
        }
    }
};
