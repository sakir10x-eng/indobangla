<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Marvel\Database\Models\EbookAsset;
use Marvel\Database\Models\Order;
use Marvel\Database\Models\Product;
use Marvel\Enums\Permission;
use Marvel\Exceptions\MarvelException;
use Marvel\Services\EbookService;

/**
 * E-book selling. A bought e-book is READ, never downloaded: the file stays on the private disk
 * and the reader receives one server-rendered, watermarked page image at a time, only after an
 * entitlement check. There is deliberately no endpoint that returns the book file.
 */
class EbookController extends CoreController
{
    public function __construct(private EbookService $ebooks)
    {
    }

    // ------------------------------------------------------------------ admin

    private function assertAdmin(Request $request): void
    {
        $user = $request->user();
        $ok = $user && (
            $user->hasPermissionTo(Permission::SUPER_ADMIN)
            || $user->hasPermissionTo(Permission::STORE_OWNER)
            || $user->hasPermissionTo(Permission::STAFF)
        );
        if (!$ok) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
    }

    /** Admin: upload (or replace) a product's e-book file and rasterise it. */
    public function upload(Request $request, $product_id)
    {
        $this->assertAdmin($request);
        $request->validate([
            // 200 MB ceiling; the file never leaves the server so size only costs us disk.
            'file'          => 'required|file|max:204800',
            'preview_pages' => 'nullable|integer|min:0|max:100',
        ]);
        $product = Product::findOrFail((int) $product_id);

        try {
            $asset = $this->ebooks->ingest((int) $product->id, $request->file('file'));
        } catch (\Throwable $e) {
            throw new MarvelException($e->getMessage());
        }
        if ($request->filled('preview_pages')) {
            $asset->update(['preview_pages' => (int) $request->input('preview_pages')]);
            $asset = $asset->fresh();
        }
        // Flag the product so the storefront can spot an e-book without joining ebook_assets on
        // every listing — the cart and the bKash-only checkout rule both need it cheaply.
        Product::where('id', $product->id)->update(['is_ebook' => $asset->status === 'ready']);

        return [
            'status'  => $asset->status === 'ready' ? 'success' : 'error',
            'ebook'   => $this->assetPayload($asset),
            'message' => $asset->status === 'ready'
                ? 'E-book ready — ' . $asset->page_count . ' pages.'
                : ($asset->error ?: 'Conversion failed.'),
        ];
    }

    /** Admin: re-run the conversion (e.g. after installing the tools). */
    public function rebuild(Request $request, $product_id)
    {
        $this->assertAdmin($request);
        $asset = EbookAsset::where('product_id', (int) $product_id)->firstOrFail();
        $this->ebooks->build($asset);
        $asset = $asset->fresh();
        Product::where('id', (int) $product_id)->update(['is_ebook' => $asset->status === 'ready']);

        return ['status' => 'success', 'ebook' => $this->assetPayload($asset)];
    }

    /** Admin: current conversion state for the product form. */
    public function status(Request $request, $product_id)
    {
        $this->assertAdmin($request);
        $asset = EbookAsset::where('product_id', (int) $product_id)->first();

        return [
            'status' => 'success',
            'ebook'  => $asset ? $this->assetPayload($asset) : null,
            'tools'  => [
                'pdf'  => $this->ebooks->hasPdfTools(),
                'epub' => $this->ebooks->hasEpubTools(),
            ],
        ];
    }

    /** Admin: remove the e-book from a product (asset row + rendered pages). */
    public function destroy(Request $request, $product_id)
    {
        $this->assertAdmin($request);
        $asset = EbookAsset::where('product_id', (int) $product_id)->first();
        if ($asset) {
            \Illuminate\Support\Facades\Storage::disk('local')->deleteDirectory('ebooks/' . $asset->product_id);
            $asset->delete();
        }
        Product::where('id', (int) $product_id)->update(['is_ebook' => false]);

        return ['status' => 'success'];
    }

    /** Admin: change how many opening pages are free to sample. */
    public function setPreview(Request $request, $product_id)
    {
        $this->assertAdmin($request);
        $request->validate(['preview_pages' => 'required|integer|min:0|max:100']);
        $asset = EbookAsset::where('product_id', (int) $product_id)->firstOrFail();
        $asset->update(['preview_pages' => (int) $request->input('preview_pages')]);

        return ['status' => 'success', 'ebook' => $this->assetPayload($asset->fresh())];
    }

    private function assetPayload(EbookAsset $a): array
    {
        return [
            'product_id'    => $a->product_id,
            'file_name'     => $a->original_name,
            'format'        => $a->original_format,
            'page_count'    => $a->page_count,
            'preview_pages' => $a->preview_pages,
            'state'         => $a->status,
            'error'         => $a->error,
        ];
    }

    // ---------------------------------------------------------------- preview
    // Free sample — deliberately PUBLIC (no login), because its whole job is to help someone
    // decide before buying. Only the opening `preview_pages` are reachable; the check is on the
    // page number itself, so there is no way to walk past the sample.

    /** Public: is there a sample, and how many pages of it. */
    public function preview(Request $request, $product_id)
    {
        $asset   = EbookAsset::where('product_id', (int) $product_id)->where('status', 'ready')->first();
        $limit   = $asset ? $asset->previewLimit() : 0;
        $product = Product::find((int) $product_id);

        return [
            'status'        => 'success',
            'product_id'    => (int) $product_id,
            'name'          => optional($product)->name,
            'slug'          => optional($product)->slug,
            'has_preview'   => $limit > 0,
            'preview_pages' => $limit,
            'page_count'    => $asset ? $asset->page_count : 0,
        ];
    }

    /** Public: one sample page, watermarked like any other. */
    public function previewPage(Request $request, $product_id, $page)
    {
        $asset = EbookAsset::where('product_id', (int) $product_id)->where('status', 'ready')->firstOrFail();
        $n = (int) $page;
        if ($n < 1 || $n > $asset->previewLimit()) {
            throw new MarvelException(NOT_AUTHORIZED);
        }

        $user  = $request->user();
        $label = $user
            ? trim((string) (optional($user->profile)->contact ?: $user->email ?: ('user#' . $user->id)))
            : 'IndoBangla sample';

        $bytes = $this->ebooks->watermarkedPage($asset, $n, $label);
        if ($bytes === null) {
            throw new MarvelException(NOT_FOUND);
        }

        return response($bytes, 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Content-Disposition', 'inline')
            ->header('X-Content-Type-Options', 'nosniff');
    }

    // --------------------------------------------------------------- customer

    /**
     * Does this account have reading rights? An e-book is prepaid (bKash only), so the order must
     * have actually been paid — and a cancelled/refunded order revokes access.
     */
    private function owns($user, int $productId): bool
    {
        if (!$user) {
            return false;
        }
        // Admins can open any e-book so they can check what they're selling.
        if ($user->hasPermissionTo(Permission::SUPER_ADMIN) || $user->hasPermissionTo(Permission::STAFF)) {
            return true;
        }

        return Order::query()
            ->where('customer_id', $user->id)
            ->where('payment_status', 'payment-success')
            ->whereNotIn('order_status', ['order-cancelled', 'order-refunded'])
            ->whereHas('products', fn ($p) => $p->where('products.id', $productId))
            ->exists();
    }

    /** Customer: the e-books this account may read. */
    public function myEbooks(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            throw new MarvelException(NOT_AUTHORIZED);
        }

        $productIds = Order::query()
            ->where('customer_id', $user->id)
            ->where('payment_status', 'payment-success')
            ->whereNotIn('order_status', ['order-cancelled', 'order-refunded'])
            ->with('products:id')
            ->get()
            ->flatMap(fn ($o) => $o->products->pluck('id'))
            ->unique()
            ->values();

        if ($productIds->isEmpty()) {
            return ['status' => 'success', 'ebooks' => []];
        }

        $assets = EbookAsset::whereIn('product_id', $productIds)->where('status', 'ready')->get();
        $products = Product::whereIn('id', $assets->pluck('product_id'))->get(['id', 'name', 'slug', 'image'])->keyBy('id');

        $ebooks = $assets->map(function ($a) use ($products) {
            $p = $products->get($a->product_id);
            return [
                'product_id' => $a->product_id,
                'name'       => optional($p)->name,
                'slug'       => optional($p)->slug,
                'image'      => optional($p)->image,
                'page_count' => $a->page_count,
            ];
        })->filter(fn ($e) => $e['name'] !== null)->values();

        return ['status' => 'success', 'ebooks' => $ebooks];
    }

    /** Customer: open a book — page count only. There is no file URL by design. */
    public function open(Request $request, $product_id)
    {
        $user  = $request->user();
        $pid   = (int) $product_id;
        $asset = EbookAsset::where('product_id', $pid)->where('status', 'ready')->firstOrFail();
        $owned = $this->owns($user, $pid);
        // Not a buyer and no sample configured → nothing to show.
        if (!$owned && $asset->previewLimit() < 1) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
        $product = Product::find($pid);

        return [
            'status'     => 'success',
            'product_id' => $pid,
            'name'       => optional($product)->name,
            'owned'      => $owned,
            'page_count' => $asset->page_count,
            // How many pages this caller may actually turn.
            'readable_pages' => $owned ? $asset->page_count : $asset->previewLimit(),
        ];
    }

    /**
     * Customer: ONE page, as a watermarked JPEG. This is the only way book content leaves the
     * server — never cacheable, never a whole file, always stamped with the reader's identity.
     */
    public function page(Request $request, $product_id, $page)
    {
        $user = $request->user();
        $pid  = (int) $product_id;
        if (!$this->owns($user, $pid)) {
            throw new MarvelException(NOT_AUTHORIZED);
        }
        $asset = EbookAsset::where('product_id', $pid)->where('status', 'ready')->firstOrFail();

        $n = (int) $page;
        if ($n < 1 || $n > $asset->page_count) {
            throw new MarvelException(NOT_FOUND);
        }

        $label = trim((string) (optional($user->profile)->contact ?: $user->email ?: ('user#' . $user->id)));
        $bytes = $this->ebooks->watermarkedPage($asset, $n, $label);
        if ($bytes === null) {
            throw new MarvelException(NOT_FOUND);
        }

        return response($bytes, 200)
            ->header('Content-Type', 'image/jpeg')
            // Never let a proxy or the browser keep a reusable copy.
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Content-Disposition', 'inline')
            ->header('X-Content-Type-Options', 'nosniff');
    }
}
