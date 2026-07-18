<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Marvel\Http\Controllers\IntegrationController;

/**
 * Closes out delivered orders once their return window has run out.
 *
 * The desk keeps 7 days to act on a delivered order (the customer has 3 to ask for a return);
 * after that the order is final and nobody edits it by accident. Safe to run repeatedly — it
 * only ever touches orders that are delivered and not yet locked.
 */
class LockDeliveredOrders extends Command
{
    protected $signature = 'orders:lock-delivered {--days= : override the admin action window}';

    protected $description = 'Mark delivered orders as সম্পন্ন (locked) once their return window has passed';

    public function handle(): int
    {
        $controller = app(IntegrationController::class);
        $days = $this->option('days');

        $locked = $days !== null
            ? $controller->lockDeliveredOrders((int) $days)
            : $controller->lockDeliveredOrders();

        $this->info("locked {$locked} delivered order(s)");
        return self::SUCCESS;
    }
}
