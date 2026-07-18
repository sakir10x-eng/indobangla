<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who has actually tried each feature — the assistant on staging, the assistant on live, and a
 * human.
 *
 * Three columns rather than one because they are three different pieces of evidence. Work is
 * verified on staging first and promoted afterwards, so "passed on staging" and "passed on live"
 * are separate claims; and the assistant passing its own tests is not the same thing as someone
 * clicking the real button. Collapsing them would let a staging tick read as a live one.
 *
 * Staging and live keep separate databases, so the assistant's two columns are seeded from
 * FeatureChecks::REGISTRY — which is code, deployed to both — rather than written across the
 * network. Only the human column is genuinely per-site, which is right: humans check live.
 *
 * Only verdicts live here. The feature list itself is the registry, so shipping a feature and
 * listing it are one commit, and no row can be quietly dropped to make the board look green.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feature_checks', function (Blueprint $table) {
            $table->id();
            $table->string('feature_key', 80)->unique();

            // What the assistant ran on staging, and what it ran again after promoting. The note
            // matters more than the tick: a claim with no note saying what was executed is just
            // an assertion.
            $table->string('ai_staging_status', 12)->default('untested');   // untested|passed|failed
            $table->text('ai_staging_note')->nullable();
            $table->timestamp('ai_staging_at')->nullable();

            $table->string('ai_live_status', 12)->default('untested');
            $table->text('ai_live_note')->nullable();
            $table->timestamp('ai_live_at')->nullable();

            // A human clicking the real thing in the real admin.
            $table->string('human_status', 12)->default('untested');
            $table->text('human_note')->nullable();
            $table->string('human_by', 100)->nullable();
            $table->timestamp('human_checked_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_checks');
    }
};
