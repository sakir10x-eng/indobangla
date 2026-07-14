<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Exchange / return requests for a single book inside an order. The customer must report
 * within 3 days of delivery and the swap must complete within 7 — after that the window
 * closes on its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('type', 20)->default('exchange');      // exchange | return
            $table->string('reason', 60)->nullable();             // damaged | wrong_book | missing_pages | other
            $table->text('note')->nullable();
            $table->json('images')->nullable();
            // requested → approved/rejected → received → completed
            $table->string('status', 20)->default('requested')->index();
            $table->unsignedBigInteger('replacement_product_id')->nullable();
            $table->boolean('restock')->default(false);           // did the returned copy go back on the shelf
            $table->text('admin_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_requests');
    }
};
