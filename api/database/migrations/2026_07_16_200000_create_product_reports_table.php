<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Backs the "report incorrect book information" option on the product page. Shaped after
 * restock_requests, which is the existing customer-submits-about-a-product feature.
 *
 * down() is intentionally a no-op: dropping this would throw away customer-submitted reports
 * that may not have been actioned yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_reports')) {
            return;
        }

        Schema::create('product_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('product_id');
            // What is wrong: price / cover / author / description / other.
            $table->string('reason')->default('other');
            $table->text('details')->nullable();
            // open -> resolved / dismissed
            $table->string('status')->default('open');
            $table->text('admin_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        // No-op on purpose: dropping this would lose customer-submitted reports.
    }
};
