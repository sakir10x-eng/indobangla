<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Marvel\Database\Models\Award;
use Marvel\Database\Models\Product;
use Marvel\Database\Models\Review;
use Marvel\Database\Models\ReviewComment;

/**
 * "My Library" — a reader's personal dashboard.
 *
 *  - my books (from their orders)
 *  - reviews other readers left on those books
 *  - new arrivals, book awards, current offers
 *  - category/author-based recommendations
 *  - stats on the reader's own reviews (reads / likes / comments)
 *
 * Community (Facebook-style feed) is a separate Phase 2 and not handled here.
 */
class LibraryController extends CoreController
{
    /** Books are type_id = 8 in this catalog. */
    private const BOOK_TYPE_ID = 8;

    /**
     * The whole My Library payload for the authenticated reader.
     */
    public function myLibrary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }

        // Distinct book ids the reader has ordered. Query the pivot directly —
        // the Product model's meta traits choke on a bare pluck().
        $myBookIds = DB::table('order_product as op')
            ->join('orders as o', 'o.id', '=', 'op.order_id')
            ->where('o.customer_id', $user->id)
            ->distinct()
            ->pluck('op.product_id')
            ->map(fn ($id) => (int) $id)
            ->values();

        $myBooks = $this->books()
            ->whereIn('id', $myBookIds)
            ->get();

        // Reviews other readers left on the reader's own books.
        $reviewsOnMyBooks = collect();
        if ($myBookIds->isNotEmpty()) {
            $reviewsOnMyBooks = Review::query()
                ->whereIn('product_id', $myBookIds)
                ->where('user_id', '!=', $user->id)
                ->with(['user:id,name', 'product:id,name,slug,image'])
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn ($r) => $this->shapeReview($r));
        }

        return [
            'status'            => 'success',
            'my_books'          => $this->shapeBooks($myBooks),
            'reviews_on_books'  => $reviewsOnMyBooks->values(),
            'new_arrivals'      => $this->shapeBooks($this->newArrivals()),
            'awards'            => $this->awardShowcase(),
            'offers'            => $this->shapeBooks($this->offers()),
            'recommendations'   => $this->shapeBooks($this->recommendations($myBookIds)),
            'my_review_stats'   => $this->myReviewStats($user->id),
        ];
    }

    /**
     * Comments on a single review ("kotojon comment korlo" — the list).
     */
    public function reviewComments($id)
    {
        $comments = ReviewComment::where('review_id', $id)
            ->with('user:id,name')
            ->orderBy('id')
            ->get()
            ->map(fn ($c) => [
                'id'         => (int) $c->id,
                'comment'    => $c->comment,
                'user'       => $c->user ? ['id' => $c->user->id, 'name' => $c->user->name] : null,
                'created_at' => $c->created_at,
            ]);

        return ['status' => 'success', 'data' => $comments];
    }

    /**
     * Add a comment to a review (auth required).
     */
    public function storeReviewComment(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }
        $data = $request->validate([
            'comment' => 'required|string|max:2000',
        ]);
        if (!Review::whereKey($id)->exists()) {
            return ['status' => 'fail', 'message' => 'Review not found'];
        }

        $comment = ReviewComment::create([
            'review_id' => $id,
            'user_id'   => $user->id,
            'comment'   => trim($data['comment']),
        ]);

        return [
            'status' => 'success',
            'data'   => [
                'id'         => (int) $comment->id,
                'comment'    => $comment->comment,
                'user'       => ['id' => $user->id, 'name' => $user->name],
                'created_at' => $comment->created_at,
            ],
        ];
    }

    /**
     * Increment a review's read counter ("koto bar pora holo").
     * Simple total — every open counts, no per-user uniqueness.
     */
    public function markReviewViewed($id)
    {
        $affected = Review::whereKey($id)->increment('views_count');
        if (!$affected) {
            return ['status' => 'fail', 'message' => 'Review not found'];
        }
        $views = (int) Review::whereKey($id)->value('views_count');
        return ['status' => 'success', 'views_count' => $views];
    }

    // ------------------------------------------------------------------ helpers

    /** Base query for a publishable, in-stock book with cheap rating aggregates. */
    private function books()
    {
        return Product::query()
            ->where('type_id', self::BOOK_TYPE_ID)
            ->where('status', 'publish')
            ->with('author:id,name,slug')
            ->withCount('reviews as total_reviews')
            ->withAvg('reviews as ratings', 'rating');
    }

    private function newArrivals()
    {
        return $this->books()
            ->whereNotNull('image')
            ->orderByDesc('id')
            ->limit(12)
            ->get();
    }

    /** Books currently on sale. */
    private function offers()
    {
        return $this->books()
            ->whereNotNull('image')
            ->whereNotNull('sale_price')
            ->where('sale_price', '>', 0)
            ->whereColumn('sale_price', '<', 'price')
            ->inRandomOrder()
            ->limit(12)
            ->get();
    }

    /**
     * Category/author-based recommendations from the reader's owned books,
     * excluding books they already have. Falls back to bestsellers for a
     * reader with no orders yet.
     */
    private function recommendations($myBookIds)
    {
        if ($myBookIds->isEmpty()) {
            return $this->books()
                ->whereNotNull('image')
                ->where('quantity', '>', 0)
                ->orderByDesc('sold_quantity')
                ->limit(12)
                ->get();
        }

        $authorIds = DB::table('products')->whereIn('id', $myBookIds)
            ->pluck('author_id')->filter()->unique();
        $categoryIds = DB::table('category_product')
            ->whereIn('product_id', $myBookIds)
            ->pluck('category_id')
            ->unique();

        return $this->books()
            ->whereNotNull('image')
            ->where('quantity', '>', 0)
            ->whereNotIn('id', $myBookIds)
            ->where(function ($q) use ($authorIds, $categoryIds) {
                if ($authorIds->isNotEmpty()) {
                    $q->orWhereIn('author_id', $authorIds);
                }
                if ($categoryIds->isNotEmpty()) {
                    $q->orWhereHas('categories', fn ($c) => $c->whereIn('categories.id', $categoryIds));
                }
            })
            ->inRandomOrder()
            ->limit(12)
            ->get();
    }

    /** Active awards with a few cover thumbnails each. */
    private function awardShowcase()
    {
        return Award::query()
            ->where('is_active', true)
            ->with(['products' => function ($q) {
                $q->select('products.id', 'name', 'slug', 'image')->limit(6);
            }])
            ->orderBy('sort_order')
            ->orderByDesc('year')
            ->get()
            ->map(fn ($a) => [
                'id'          => (int) $a->id,
                'title'       => $a->title,
                'year'        => $a->year,
                'description' => $a->description,
                'image'       => is_array($a->image) ? ($a->image['original'] ?? null) : null,
                'books'       => $a->products->map(fn ($p) => $this->shapeBook($p))->values(),
            ]);
    }

    /**
     * The reader's own review activity: total reads, likes and comments,
     * plus a per-review breakdown.
     */
    private function myReviewStats($userId)
    {
        $reviews = Review::query()
            ->where('user_id', $userId)
            ->with('product:id,name,slug,image')
            ->latest()
            ->get();

        $rows = $reviews->map(fn ($r) => $this->shapeReview($r));

        return [
            'total_reviews'  => $rows->count(),
            'total_reads'    => (int) $reviews->sum('views_count'),
            'total_likes'    => (int) $rows->sum('likes'),
            'total_comments' => (int) $rows->sum('comments_count'),
            'reviews'        => $rows->values(),
        ];
    }

    // ------------------------------------------------------------------ shaping

    private function shapeReview(Review $r): array
    {
        return [
            'id'             => (int) $r->id,
            'rating'         => (int) $r->rating,
            'comment'        => $r->comment,
            'photos'         => $r->photos,
            'reads'          => (int) ($r->views_count ?? 0),
            'likes'          => (int) $r->positive_feedbacks_count,
            'comments_count' => (int) $r->comments_count,
            'created_at'     => $r->created_at,
            'user'           => $r->relationLoaded('user') && $r->user
                ? ['id' => $r->user->id, 'name' => $r->user->name]
                : null,
            'product'        => $r->relationLoaded('product') && $r->product
                ? $this->shapeBook($r->product)
                : null,
        ];
    }

    private function shapeBooks($books): array
    {
        return collect($books)->map(fn ($p) => $this->shapeBook($p))->values()->all();
    }

    private function shapeBook($p): array
    {
        $image = is_array($p->image) ? $p->image : (array) $p->image;
        return [
            'id'            => (int) $p->id,
            'name'          => $p->name,
            'slug'          => $p->slug,
            'image'         => $image['original'] ?? ($image['thumbnail'] ?? null),
            'price'         => isset($p->price) ? (float) $p->price : null,
            'sale_price'    => $p->sale_price !== null ? (float) $p->sale_price : null,
            'author'        => ($p->relationLoaded('author') && $p->author) ? $p->author->name : null,
            'ratings'       => isset($p->ratings) ? round((float) $p->ratings, 1) : null,
            'total_reviews' => isset($p->total_reviews) ? (int) $p->total_reviews : null,
        ];
    }
}
