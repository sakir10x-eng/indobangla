<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Marvel\Database\Models\CourierArea;
use Marvel\Http\Controllers\IntegrationController;

/**
 * Keep the local courier_areas list fresh.
 *
 * Checkout reads this table rather than calling RedX, so it must not be allowed to
 * go stale — RedX adds and renames areas. The sync itself upserts and never
 * truncates, so a failed run leaves the existing list serving customers.
 */
class SyncCourierAreas extends Command
{
    protected $signature = 'courier:sync-areas';

    protected $description = "Refresh the local courier delivery-area list from RedX";

    public function handle(): int
    {
        $before = CourierArea::where('provider', 'redx')->count();

        try {
            $res = (new IntegrationController())->syncCourierAreas(new Request());
        } catch (\Throwable $e) {
            // Exit 0, not 1: a courier outage is expected and must not page anyone.
            // The previous list is intact and checkout keeps working.
            $this->warn("Area sync skipped: {$e->getMessage()} ({$before} areas kept)");
            return self::SUCCESS;
        }

        $this->info("Synced {$res['synced']} areas from RedX (table now holds {$res['total']}, was {$before}).");
        return self::SUCCESS;
    }
}
