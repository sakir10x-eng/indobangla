<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Comments on a review ("kotojon comment korlo"). Likes on a review already
 * exist via the polymorphic `feedbacks` table, so this only adds threaded text.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('review_comments')) {
            Schema::create('review_comments', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('review_id')->index();
                $table->unsignedInteger('user_id')->index();
                $table->text('comment');
                $table->softDeletes();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('review_comments');
    }
};
