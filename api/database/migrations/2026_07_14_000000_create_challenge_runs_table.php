<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per attempt at the 1-minute book challenge.
 *
 * The run is the source of truth, not the browser: the countdown, which books were added,
 * the discount earned and the staked points all live here, so a second tab or a doctored
 * request cannot buy a bigger discount.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('challenge_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            // Handed to the tab that started the run; every add must present it back.
            $table->string('session_token', 64);
            $table->timestamp('started_at');
            $table->timestamp('expires_at');
            // running → checkout → completed | forfeited
            $table->string('status', 20)->default('running')->index();
            $table->json('product_ids')->nullable();
            // How many books came off each source page — the rules cap this, to force the
            // customer to actually go hunting rather than farm one listing.
            $table->json('page_hits')->nullable();
            $table->unsignedInteger('books_count')->default(0);
            $table->unsignedInteger('discount_pct')->default(0);
            $table->unsignedBigInteger('coupon_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedInteger('points_staked')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('challenge_runs');
    }
};
