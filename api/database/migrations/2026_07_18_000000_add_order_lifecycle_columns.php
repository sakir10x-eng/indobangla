<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two lifecycle markers the order board needs, kept as columns rather than order statuses.
 *
 * `locked_at` is the "সম্পন্ন" state: an order that was delivered, sat out its return window and
 * is now final. It is deliberately NOT a new order_status. Every revenue and analytics query in
 * this codebase whitelists statuses (`order_status = 'order-completed'`, or an IN list) in about
 * twenty places, so a second terminal status would have to be added to every one of them and a
 * single miss would silently under-report money. Worse, OrderStatusManagerWithPaymentTrait
 * deducts the vendor balance the moment an order leaves 'order-completed', so moving delivered
 * orders to a new status would claw back their earnings. A flag leaves the status — and
 * therefore every number — exactly where it is.
 *
 * `archived_at` hides an order from the working list without deleting it. Void orders get it
 * automatically; the desk can set it by hand for anything else.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Indexed because the board filters on "not archived" on every single load, and
            // sweeps "delivered, not yet locked" on a schedule.
            $table->timestamp('locked_at')->nullable()->index();
            $table->timestamp('archived_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['locked_at']);
            $table->dropIndex(['archived_at']);
            $table->dropColumn(['locked_at', 'archived_at']);
        });
    }
};
