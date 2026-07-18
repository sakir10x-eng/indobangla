<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Marvel\Http\Controllers\IntegrationController;

/**
 * Auto-void pre-orders whose advance was never paid.
 *
 * A pre-order is created *before* payment: the record lands as pending/pending with a pay
 * link, and stampPreorder has already reserved stock and taken a pre-order slot. If the
 * customer never pays the advance, that order sits forever holding stock + quota that real
 * buyers can't reach. This closes them out after a grace period — voiding releases both,
 * through the Order model's own `updated` hook. Safe to run repeatedly.
 */
class VoidAbandonedPreorders extends Command
{
    protected $signature = 'orders:void-abandoned-preorders {--hours=24 : advance-unpaid grace period} {--limit=200 : max orders per run}';

    protected $description = 'Void pre-orders whose advance stayed unpaid past the grace period (releases stock + pre-order quota)';

    public function handle(): int
    {
        $controller = app(IntegrationController::class);
        $voided = $controller->voidAbandonedPreorders(
            (int) $this->option('hours'),
            (int) $this->option('limit'),
        );
        $this->info("voided {$voided} abandoned pre-order(s)");
        return self::SUCCESS;
    }
}
