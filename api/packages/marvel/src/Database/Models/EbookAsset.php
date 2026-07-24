<?php

namespace Marvel\Database\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A sellable e-book's stored asset. See the migration for why nothing here is public: the file
 * lives on the private disk and readers only ever receive watermarked page images.
 */
class EbookAsset extends Model
{
    protected $table = 'ebook_assets';

    protected $fillable = [
        'product_id',
        'original_name',
        'original_format',
        'original_path',
        'pdf_path',
        'page_count',
        'status',
        'error',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'page_count' => 'integer',
    ];

    /**
     * Paths are internal plumbing — never let them reach an API response, or the private disk
     * layout leaks to the browser.
     */
    protected $hidden = ['original_path', 'pdf_path'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /** Private-disk directory holding this book's rasterised pages. */
    public function pageDir(): string
    {
        return 'ebooks/' . $this->product_id . '/pages';
    }

    /** Private-disk path of one rasterised page (1-based). */
    public function pagePath(int $page): string
    {
        return $this->pageDir() . '/p-' . str_pad((string) $page, 4, '0', STR_PAD_LEFT) . '.jpg';
    }

    public function isReady(): bool
    {
        return $this->status === 'ready' && $this->page_count > 0;
    }
}
