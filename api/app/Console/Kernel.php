<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        //
    ];

    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Close out delivered orders whose return window has run out. Hourly rather than daily
        // so an order locks close to its seventh day instead of up to a day late; the query is
        // indexed on locked_at and matches nothing on most runs.
        $schedule->command('orders:lock-delivered')
            ->hourly()
            ->withoutOverlapping()
            ->runInBackground();

        // Checkout serves delivery areas from our own table, so it has to be kept in
        // step with RedX (they add and rename areas). Nightly is plenty — the list
        // moves slowly — and the command keeps the old rows if RedX is unreachable.
        $schedule->command('bkash:reconcile')->everyFifteenMinutes()->withoutOverlapping()->runInBackground();
        $schedule->command('courier:sync-status')->hourly()->withoutOverlapping()->runInBackground();
        $schedule->command('courier:sync-areas')
            ->dailyAt('03:40')
            ->withoutOverlapping()
            ->runInBackground();

        // Pre-orders reserve stock and a pre-order slot the moment they're created, before the
        // advance is paid. When the advance never comes, this hands both back after a day so the
        // quota reflects real, paid demand. Hourly; matches nothing on most runs.
        $schedule->command('orders:void-abandoned-preorders')
            ->hourly()
            ->withoutOverlapping()
            ->runInBackground();

        // Recycle bin retention: permanently delete products that have been in the
        // recycle bin for more than 30 days. Once a day is plenty.
        $schedule->command('products:purge-trashed')
            ->dailyAt('04:10')
            ->withoutOverlapping()
            ->runInBackground();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
