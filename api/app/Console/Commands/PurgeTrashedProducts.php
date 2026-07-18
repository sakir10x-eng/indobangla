<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Marvel\Database\Models\Product;

/**
 * Recycle bin retention: a product deleted from the admin is soft-deleted and
 * sits in the recycle bin so it can be restored. After 30 days it is purged for
 * good. Runs daily.
 */
class PurgeTrashedProducts extends Command
{
    protected $signature = 'products:purge-trashed {--days=30 : recycle-bin retention} {--limit=500 : max products per run}';
    protected $description = 'Permanently delete products that have been in the recycle bin longer than the retention window';

    public function handle(): int
    {
        $days  = max(1, (int) $this->option('days'));
        $limit = max(1, (int) $this->option('limit'));

        $due = Product::onlyTrashed()
            ->where('deleted_at', '<', now()->subDays($days))
            ->limit($limit)
            ->get();

        $n = 0;
        foreach ($due as $p) {
            try {
                $p->categories()->detach();
                $p->tags()->detach();
                $p->forceDelete();
                $n++;
            } catch (\Throwable $e) {
                $this->error("Failed to purge product {$p->id}: {$e->getMessage()}");
            }
        }
        $this->info("Purged {$n} product(s) past the {$days}-day recycle-bin window.");
        return self::SUCCESS;
    }
}
