<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'ops_meta')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->json('ops_meta')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'ops_meta')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('ops_meta');
            });
        }
    }
};
