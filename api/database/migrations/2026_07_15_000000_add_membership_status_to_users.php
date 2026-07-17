<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reader's Club card lifecycle: on top of membership_no + membership_tier, a card now
 * carries a status (active | cancelled | banned) and a validity window (activated_at →
 * expires_at). Admin can cancel/ban a card any time; an expired/cancelled/banned card
 * stops discounting because its bound coupon is removed by syncMemberCoupon().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'membership_status')) {
                $table->string('membership_status', 20)->nullable();   // active | cancelled | banned
            }
            if (!Schema::hasColumn('users', 'membership_activated_at')) {
                $table->timestamp('membership_activated_at')->nullable();
            }
            if (!Schema::hasColumn('users', 'membership_expires_at')) {
                $table->timestamp('membership_expires_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['membership_status', 'membership_activated_at', 'membership_expires_at']);
        });
    }
};
