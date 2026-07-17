<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Local copy of the courier's delivery-area list.
 *
 * The area picker used to hit RedX live on every lookup behind a 24h cache, so a
 * RedX outage (or an expired cache refilled during one) left customers unable to
 * pick an area at checkout — and an empty result got cached for another 24h.
 * Holding the list ourselves means checkout only ever reads our own database.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_areas', function (Blueprint $table) {
            $table->id();
            // Scoped by provider so Steadfast/Pathao can land here later without a rename.
            $table->string('provider', 32)->default('redx');
            // The courier's own id — what a shipment must quote as delivery_area_id.
            $table->unsignedBigInteger('area_id');
            $table->string('name');
            $table->string('district')->nullable();
            $table->string('zone')->nullable();
            $table->string('post_code', 16)->nullable();
            $table->timestamps();

            // The upsert key: re-syncing must update a row, never duplicate it.
            $table->unique(['provider', 'area_id']);
            // The picker searches by name, and lists by district.
            $table->index(['provider', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_areas');
    }
};
