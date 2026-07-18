<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reader community (Phase 2) — Facebook-style posts about books.
 * Auto-published; `status` flips to 'hidden' when an admin moderates a
 * reported post. `product_id` optionally tags the book the post is about.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('community_posts')) {
            Schema::create('community_posts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('user_id')->index();
                $table->text('body')->nullable();
                $table->json('photos')->nullable();
                $table->unsignedBigInteger('product_id')->nullable()->index();
                $table->string('status')->default('published')->index();
                $table->unsignedInteger('report_count')->default(0);
                $table->softDeletes();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_posts');
    }
};
