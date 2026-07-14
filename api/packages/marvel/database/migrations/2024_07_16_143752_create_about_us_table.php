<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('about_us', function (Blueprint $table) {
            $table->id();
            $table->json('page_options');
            $table->string('language')->unique()->default(DEFAULT_LANGUAGE);
            $table->timestamps();
        });

        Schema::create('custom_pages', function (Blueprint $table) {
            $table->id();
            $table->json('page_options');
            $table->string('language')->unique()->default(DEFAULT_LANGUAGE);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('about_us');
        Schema::dropIfExists('custom_pages');
    }
};