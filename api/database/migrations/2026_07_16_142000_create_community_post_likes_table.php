<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Likes on a community post — one per user, toggled. */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_post_likes')) {
            Schema::create('community_post_likes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('post_id')->index();
                $table->unsignedInteger('user_id')->index();
                $table->timestamps();
                $table->unique(['post_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_post_likes');
    }
};
