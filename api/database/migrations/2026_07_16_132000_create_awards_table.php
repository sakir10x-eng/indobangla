<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Book awards, admin-managed ("kon boi ki award peyeche"). An award can be
 * attached to many books via the award_product pivot.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('awards')) {
            Schema::create('awards', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('title');
                $table->unsignedSmallInteger('year')->nullable();
                $table->text('description')->nullable();
                $table->json('image')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('awards');
    }
};
