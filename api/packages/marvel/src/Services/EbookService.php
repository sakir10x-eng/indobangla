<?php

namespace Marvel\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Marvel\Database\Models\EbookAsset;

/**
 * Turns an uploaded e-book into watermarked page images on the PRIVATE disk.
 *
 * Nothing here ever writes to the public disk and the reader never receives the book file —
 * only one rasterised, watermarked page at a time through an entitlement-checked endpoint.
 * EPUB is normalised to PDF first (calibre) so both formats share a single rasterisation path.
 */
class EbookService
{
    /** Rasterisation DPI — sharp on a phone without producing enormous files. */
    private const DPI = 130;

    public function hasPdfTools(): bool
    {
        return $this->bin('pdftoppm') !== null && $this->bin('pdfinfo') !== null;
    }

    public function hasEpubTools(): bool
    {
        return $this->bin('ebook-convert') !== null;
    }

    private function bin(string $name): ?string
    {
        $path = trim((string) @shell_exec('command -v ' . escapeshellarg($name) . ' 2>/dev/null'));
        return $path !== '' ? $path : null;
    }

    /** Store an upload on the private disk and (re)build its page images. */
    public function ingest(int $productId, UploadedFile $file): EbookAsset
    {
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if (!in_array($ext, ['pdf', 'epub'], true)) {
            throw new \RuntimeException('Only PDF or EPUB e-books can be uploaded.');
        }
        if ($ext === 'epub' && !$this->hasEpubTools()) {
            throw new \RuntimeException('EPUB conversion is unavailable on this server (calibre is not installed). Please upload a PDF instead.');
        }

        // 'local' disk = storage/app — private, never web-served.
        $stored = $file->storeAs('ebooks/' . $productId, 'source.' . $ext, 'local');

        $asset = EbookAsset::updateOrCreate(
            ['product_id' => $productId],
            [
                'original_name'   => $file->getClientOriginalName(),
                'original_format' => $ext,
                'original_path'   => $stored,
                'pdf_path'        => null,
                'page_count'      => 0,
                'status'          => 'pending',
                'error'           => null,
            ]
        );

        $this->build($asset);

        return $asset->fresh();
    }

    /** Normalise to PDF, rasterise every page, record the page count. Never throws. */
    public function build(EbookAsset $asset): void
    {
        @set_time_limit(0);
        try {
            if (!$this->hasPdfTools()) {
                throw new \RuntimeException('PDF tools (poppler-utils) are not installed on this server.');
            }
            $disk = Storage::disk('local');
            $srcAbs = $disk->path($asset->original_path);
            if (!is_file($srcAbs)) {
                throw new \RuntimeException('The uploaded file is missing from storage.');
            }

            $pdfRel = 'ebooks/' . $asset->product_id . '/book.pdf';
            $pdfAbs = $disk->path($pdfRel);
            @mkdir(dirname($pdfAbs), 0775, true);
            if ($asset->original_format === 'epub') {
                $this->run(['ebook-convert', $srcAbs, $pdfAbs]);
            } elseif ($srcAbs !== $pdfAbs) {
                copy($srcAbs, $pdfAbs);
            }
            if (!is_file($pdfAbs)) {
                throw new \RuntimeException('Could not produce a PDF from the upload.');
            }

            $info  = $this->run(['pdfinfo', $pdfAbs]);
            $pages = preg_match('/^Pages:\s+(\d+)/m', $info, $m) ? (int) $m[1] : 0;
            if ($pages < 1) {
                throw new \RuntimeException('Could not read the page count from the PDF.');
            }

            $pageDirAbs = $disk->path($asset->pageDir());
            // Wipe any previous build so re-uploading can't leave stale pages behind.
            if (is_dir($pageDirAbs)) {
                array_map('unlink', glob($pageDirAbs . '/*.jpg') ?: []);
            }
            @mkdir($pageDirAbs, 0775, true);

            $this->run(['pdftoppm', '-jpeg', '-r', (string) self::DPI, $pdfAbs, $pageDirAbs . '/pg']);

            // pdftoppm pads its index to the page-count width; normalise to our p-0001.jpg scheme.
            $produced = glob($pageDirAbs . '/pg-*.jpg') ?: [];
            natsort($produced);
            $n = 0;
            foreach ($produced as $f) {
                $n++;
                @rename($f, $disk->path($asset->pagePath($n)));
            }
            if ($n < 1) {
                throw new \RuntimeException('No page images were produced.');
            }

            $asset->update([
                'pdf_path'   => $pdfRel,
                'page_count' => $n,
                'status'     => 'ready',
                'error'      => null,
            ]);
        } catch (\Throwable $e) {
            $asset->update(['status' => 'failed', 'error' => substr($e->getMessage(), 0, 1000)]);
        }
    }

    private function run(array $cmd): string
    {
        $line = implode(' ', array_map('escapeshellarg', $cmd)) . ' 2>&1';
        return (string) @shell_exec($line);
    }

    /**
     * One page as JPEG bytes with the buyer's identity burnt in. Applied server-side so the
     * client cannot strip it, and repeated down the page so a cropped screenshot still carries
     * the trace back to the account that took it.
     */
    public function watermarkedPage(EbookAsset $asset, int $page, string $label): ?string
    {
        $disk = Storage::disk('local');
        $rel  = $asset->pagePath($page);
        if (!$disk->exists($rel)) {
            return null;
        }
        $abs = $disk->path($rel);

        $img = @imagecreatefromjpeg($abs);
        if (!$img) {
            return (string) @file_get_contents($abs);
        }

        $w    = imagesx($img);
        $h    = imagesy($img);
        // Built-in GD fonts are Latin-only, so the label is the buyer's phone/email (ASCII).
        $text = mb_substr(preg_replace('/[^\x20-\x7E]/', '', $label) ?: 'IndoBangla', 0, 60);
        $grey = imagecolorallocatealpha($img, 120, 120, 120, 95);
        $step = (int) max(140, $h * 0.22);
        for ($y = (int) ($h * 0.12); $y < $h; $y += $step) {
            imagestring($img, 4, (int) ($w * 0.08), $y, $text, $grey);
            imagestring($img, 4, (int) ($w * 0.55), $y + 40, $text, $grey);
        }

        ob_start();
        imagejpeg($img, null, 82);
        $bytes = ob_get_clean();
        imagedestroy($img);

        return $bytes ?: null;
    }
}
