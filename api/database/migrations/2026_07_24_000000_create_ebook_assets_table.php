<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `ebook_assets` holds one row per sellable e-book.
 *
 * The uploaded file itself NEVER lives on the public disk and is never handed to the browser:
 * it is stored on the private `local` disk, normalised to PDF (EPUB is converted first), and
 * rasterised page-by-page. The reader then requests one watermarked image per page through an
 * authenticated, entitlement-checked endpoint — so there is no file to download or forward.
 *
 * Page images are derived, not tracked here: they live at
 *   storage/app/ebooks/{product_id}/p-0001.jpg …
 * so re-running the conversion simply rewrites them.
 */
return new class extends Migration
{
    public function up(): void
    {
        // A plain flag on the product so the storefront can tell an e-book apart without a join
        // on every listing (the cart, and the checkout's bKash-only rule, both need it cheaply).
        // Kept in sync by EbookController when a file is attached or removed.
        if (!Schema::hasColumn('products', 'is_ebook')) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('is_ebook')->default(false)->index();
            });
        }

        if (Schema::hasTable('ebook_assets')) {
            return;
        }

        Schema::create('ebook_assets', function (Blueprint $table) {
            $table->bigIncrements('id');
            // One e-book per product. No FK cascade: deleting a product should not silently
            // destroy an asset customers may still have reading rights to.
            $table->unsignedBigInteger('product_id')->unique();
            $table->string('original_name', 255)->nullable();
            $table->string('original_format', 16)->default('pdf'); // pdf | epub
            $table->string('original_path', 512)->nullable();      // private disk, as uploaded
            $table->string('pdf_path', 512)->nullable();           // private disk, normalised PDF
            $table->unsignedInteger('page_count')->default(0);
            // Free sample: how many opening pages anyone may read before buying. 0 = no preview.
            $table->unsignedInteger('preview_pages')->default(10);
            // pending  — uploaded, not yet rasterised
            // ready    — page images available
            // failed   — conversion failed (see error)
            $table->string('status', 16)->default('pending');
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ebook_assets');
    }
};
