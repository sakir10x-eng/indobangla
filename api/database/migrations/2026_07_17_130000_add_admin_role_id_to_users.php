<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Custom sub-admin roles: a nullable role reference on the user.
 * NULL  => full super-admin (sees & does everything, unchanged behaviour).
 * set   => a restricted sub-admin bound to a role defined in
 *          settings.options.admin_roles (only the ticked sections are visible).
 * Roles themselves live in settings.options (no dedicated table) so nothing
 * schema-heavy is added to the live DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'admin_role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('admin_role_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'admin_role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('admin_role_id');
            });
        }
    }
};
