<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Marvel\Http\Controllers\IntegrationController;

/**
 * Pull RedX delivery status for in-flight orders and advance order_status to match. RedX has no
 * webhook wired here, so without this the board never learns a parcel was delivered — it sits on
 * "ready to ship" while RedX shows "delivered". Runs hourly from the scheduler.
 */
class SyncCourierStatuses extends Command
{
    protected $signature = "courier:sync-status {--days=45} {--limit=500}";
    protected $description = "Pull RedX delivery status for in-flight orders and advance order_status to match";

    public function handle()
    {
        $res = (new IntegrationController())->syncCourierStatuses((int) $this->option("days"), (int) $this->option("limit"));
        $this->info("Courier status sync: checked {$res["checked"]}, updated {$res["updated"]}.");
        foreach ($res["details"] as $d) {
            $this->line("  #{$d["id"]}: {$d["from"]} -> {$d["to"]}");
        }
        return 0;
    }
}
