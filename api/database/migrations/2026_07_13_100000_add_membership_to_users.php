<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Membership cards: every user carries an 8-digit card number (digits only, like a
 * credit-card number) plus an optional tier. The card number doubles as a coupon code
 * at checkout, so the tier discount rides the existing coupon flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'membership_no')) {
                $table->string('membership_no', 8)->nullable()->unique();
            }
            if (!Schema::hasColumn('users', 'membership_tier')) {
                $table->string('membership_tier', 20)->nullable();   // silver | gold | premium
            }
        });

        // Backfill a unique 8-digit card for everyone who doesn't have one yet.
        // 10000000–99999999 keeps it a true 8-digit number (never a leading zero).
        DB::table('users')->whereNull('membership_no')->orderBy('id')->chunkById(500, function ($users) {
            foreach ($users as $u) {
                do {
                    $no = (string) random_int(10000000, 99999999);
                } while (DB::table('users')->where('membership_no', $no)->exists());
                DB::table('users')->where('id', $u->id)->update(['membership_no' => $no]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['membership_no', 'membership_tier']);
        });
    }
};
