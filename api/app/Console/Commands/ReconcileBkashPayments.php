<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Marvel\Http\Controllers\IntegrationController;

/**
 * Safety-net for bKash tokenized checkout: recover orders whose payment completed on bKash but
 * whose browser redirect back to /bkash-callback was lost, so execute/settle never ran. Runs
 * every 15 minutes; idempotent and conservative (see IntegrationController::reconcileBkashPayments).
 */
class ReconcileBkashPayments extends Command
{
    protected $signature = "bkash:reconcile {--days=2} {--limit=200}";
    protected $description = "Reconcile unsettled bKash orders against bKash and settle/capture the ones that really paid";

    public function handle()
    {
        $res = (new IntegrationController())->reconcileBkashPayments((int) $this->option("days"), (int) $this->option("limit"));
        $this->info("bKash reconcile: checked {$res["checked"]}, already-paid settled {$res["settled"]}, recovered-capture {$res["captured"]}.");
        foreach ($res["details"] as $d) {
            $this->line("  #{$d["id"]}: {$d["action"]}" . (isset($d["trx"]) && $d["trx"] ? " (trx {$d["trx"]})" : ""));
        }
        return 0;
    }
}
