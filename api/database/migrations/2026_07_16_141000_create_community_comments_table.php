<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Comments on a community post. */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_comments')) {
            Schema::create('community_comments', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('post_id')->index();
                $table->unsignedInteger('user_id')->index();
                $table->text('body');
                $table->softDeletes();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_comments');
    }
};
