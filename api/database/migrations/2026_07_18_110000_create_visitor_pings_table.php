<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Live-visitor heartbeat store for the command centre.
 *
 * The storefront upserts one row per visitor per beat (IntegrationController::presencePing),
 * and the dashboard counts rows seen inside the presence window (::liveUsers). Anonymous by
 * design — `visitor_id` is a random client token, never a user id — so this holds no PII.
 *
 * Deliberately timestamp-free: the upsert only ever writes `last_seen`, so Laravel's
 * created_at/updated_at (non-null, no default) would fail the insert. `last_seen` is the
 * only column any query reads.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_pings', function (Blueprint $table) {
            $table->id();
            // The upsert key — a random per-browser token, capped at 64 chars by the controller.
            $table->string('visitor_id', 64)->unique();
            // Every presence query filters on this ("seen since T"), so it must be indexed.
            $table->timestamp('last_seen')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_pings');
    }
};
