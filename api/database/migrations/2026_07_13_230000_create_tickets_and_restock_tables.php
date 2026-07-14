<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Support tickets (#10) — our own tables; Pickbazar already owns `tickets`.
 * and restock requests (#12).
 *
 * A customer gets 3 free restock requests. Once the admin has confirmed 3 of them and the
 * customer still hasn't ordered, further requests cost 10 wallet points each — the shop
 * warns them before charging.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id')->index();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->string('subject');
            $table->string('category', 40)->default('other');   // order | payment | delivery | book | other
            $table->string('status', 20)->default('open')->index();  // open | answered | closed
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamps();
        });

        Schema::create('support_ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ticket_id')->index();
            $table->string('sender', 12)->default('customer');   // customer | admin
            $table->text('message');
            $table->timestamps();
        });

        Schema::create('restock_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            // requested → confirmed (admin will restock) | declined; ordered once they buy it
            $table->string('status', 20)->default('requested')->index();
            $table->decimal('confirmed_price', 12, 2)->nullable();
            $table->unsignedInteger('points_charged')->default(0);
            $table->text('admin_note')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            $table->unique(['customer_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('restock_requests');
    }
};
