<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RedX's /areas returns `zone_id` (an integer), not `zone_name` — so the string
 * `zone` column syncRedxAreas() was writing stayed empty for every row. Store the
 * id RedX actually sends; the name column is kept for a provider that supplies one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courier_areas', function (Blueprint $table) {
            $table->unsignedInteger('zone_id')->nullable()->after('zone');
        });
    }

    public function down(): void
    {
        Schema::table('courier_areas', function (Blueprint $table) {
            $table->dropColumn('zone_id');
        });
    }
};
