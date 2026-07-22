<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `analytics_events` backs the storefront tracker (IntegrationController::track) and the
 * /admin/analytics dashboard (analyticsSummary) — but no migration ever created it, so on any
 * box where the table was not built by hand every tracked event is lost. Both the writer and
 * the reader swallow their exceptions (correctly — analytics must never break a page view or a
 * login), which means a missing table produces no error anywhere: the dashboard just reports
 * zero for ever. That silence is exactly why this went unnoticed.
 *
 * Guarded with hasTable() so it is a no-op where the table was already created manually.
 * Column widths mirror the substr() limits in track() / logLoginBlocked().
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('analytics_events')) {
            return;
        }

        Schema::create('analytics_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('session_id', 64);
            // Nullable and no FK: most shoppers browse logged out, and deleting a user must not
            // cascade away the history that explains a sales trend.
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('event', 32);
            $table->string('path', 512)->nullable();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->string('referrer', 512)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('meta')->nullable();
            $table->string('ip', 64)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamp('created_at')->nullable();

            // analyticsSummary filters by created_at, then groups by event / path / session_id,
            // and walks one session's events in order.
            $table->index('created_at');
            $table->index(['event', 'created_at']);
            $table->index(['session_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
