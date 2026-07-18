<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The saved-card tables never existed in the imported database, so /cards died with
 * "Table 'indobangla.payment_methods' doesn't exist". Create them with Marvel's standard
 * shape. Both are hasTable-guarded, so re-running is safe, and down() is intentionally a
 * no-op — dropping these would throw away customers' saved cards.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_gateways')) {
            Schema::create('payment_gateways', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('customer_id')->nullable();
                $table->string('gateway_name')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('payment_methods')) {
            Schema::create('payment_methods', function (Blueprint $table) {
                $table->id();
                $table->string('method_key')->nullable();
                $table->boolean('default_card')->default(false);
                $table->unsignedBigInteger('payment_gateway_id')->nullable();
                $table->string('fingerprint')->nullable();
                $table->string('owner_name')->nullable();
                $table->string('network')->nullable();
                $table->string('type')->nullable();
                $table->string('last4')->nullable();
                $table->string('expires')->nullable();
                $table->string('origin')->nullable();
                $table->string('verification_check')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        // No-op on purpose: dropping these tables would lose saved payment methods.
    }
};
