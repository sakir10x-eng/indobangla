<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot: which books hold which award.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('award_product')) {
            Schema::create('award_product', function (Blueprint $table) {
                $table->unsignedBigInteger('award_id')->index();
                $table->unsignedBigInteger('product_id')->index();
                $table->timestamps();
                $table->unique(['award_id', 'product_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('award_product');
    }
};
