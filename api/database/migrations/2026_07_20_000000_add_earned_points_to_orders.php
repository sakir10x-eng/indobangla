<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn("orders", "earned_points")) {
            Schema::table("orders", function (Blueprint $table) {
                $table->integer("earned_points")->nullable()->after("total");
            });
        }
    }
    public function down(): void
    {
        if (Schema::hasColumn("orders", "earned_points")) {
            Schema::table("orders", function (Blueprint $table) {
                $table->dropColumn("earned_points");
            });
        }
    }
};
