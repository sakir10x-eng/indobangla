<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Reader reports on a community post — one per user; admin reviews & hides. */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_post_reports')) {
            Schema::create('community_post_reports', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('post_id')->index();
                $table->unsignedInteger('user_id')->index();
                $table->string('reason')->nullable();
                $table->timestamps();
                $table->unique(['post_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_post_reports');
    }
};
