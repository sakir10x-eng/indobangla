<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Abandoned checkouts: the shop records an intent when someone reaches the checkout page,
 * and marks it converted once the order is placed. What's left un-converted is the list
 * the team can call back.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkout_intents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('name')->nullable();
            $table->string('contact', 40)->nullable();
            $table->string('email')->nullable();
            $table->json('items')->nullable();          // [{id, name, qty, price}]
            $table->decimal('total', 12, 2)->default(0);
            $table->unsignedInteger('item_count')->default(0);
            $table->boolean('converted')->default(false)->index();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->boolean('contacted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_intents');
    }
};
