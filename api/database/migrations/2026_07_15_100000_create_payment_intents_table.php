<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The imported production DB is missing the `payment_intents` table (part of the big
 * 2021_04_17 Marvel migration, which can't be re-run because its other tables already
 * exist). Without it, any gateway that builds a payment intent (bKash, Stripe) 500s at
 * checkout with "Table 'payment_intents' doesn't exist". This adds just that table.
 *
 * Run only this file:
 *   php artisan migrate --path=database/migrations/2026_07_15_100000_create_payment_intents_table.php --force
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment_intents')) {
            return;
        }
        Schema::create('payment_intents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('payment_gateway')->nullable();
            $table->json('payment_intent_info')->nullable();
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_intents');
    }
};
