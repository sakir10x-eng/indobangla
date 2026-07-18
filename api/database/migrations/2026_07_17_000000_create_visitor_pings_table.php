<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "How many people are on the site right now" for the admin command centre.
 *
 * This lives in MySQL rather than Redis on purpose: the box runs a redis container and
 * REDIS_HOST is set, but the API has **no redis client** — neither the phpredis extension nor
 * predis is installed — so `Redis::…` throws `Class "Redis" not found`. CACHE_DRIVER is `file`,
 * which cannot count keys either. A tiny table is the option that actually works here, and the
 * write volume is trivial: one upsert per visitor per heartbeat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_pings', function (Blueprint $table) {
            // The browser's own id — one row per visitor, overwritten on every heartbeat, so the
            // table stays roughly the size of "people online" rather than growing per request.
            $table->string('visitor_id', 64)->primary();
            $table->timestamp('last_seen')->useCurrent();
            // The only query is "how many since X", and the pruner deletes by the same column.
            $table->index('last_seen');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_pings');
    }
};
