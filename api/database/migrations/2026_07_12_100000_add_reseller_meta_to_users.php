<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode B — reseller/commission business. All reseller state (opened, balances,
 * added products, ledger, payout requests) lives in one JSON column on the user,
 * keeping it self-contained without touching the core orders/products schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'reseller_meta')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('reseller_meta')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'reseller_meta')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('reseller_meta');
            });
        }
    }
};
