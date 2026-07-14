<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A restock request is a promise, so it needs a date attached — and the customer needs a
 * way to say what they actually want (edition, language, "the one with the red cover").
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('restock_requests', function (Blueprint $table) {
            // How many days the admin says it will take to bring the book in. The expected
            // date is derived from confirmed_at + this, so editing it later moves the date.
            $table->unsignedSmallInteger('eta_days')->nullable()->after('confirmed_price');
            $table->text('customer_note')->nullable()->after('admin_note');
        });
    }

    public function down()
    {
        Schema::table('restock_requests', function (Blueprint $table) {
            $table->dropColumn(['eta_days', 'customer_note']);
        });
    }
};
