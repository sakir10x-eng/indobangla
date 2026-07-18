<?php

namespace Marvel\Http\Controllers;

use Illuminate\Http\Request;
use Marvel\Database\Models\CommunityComment;
use Marvel\Database\Models\CommunityPost;
use Marvel\Database\Models\CommunityPostLike;
use Marvel\Database\Models\CommunityPostReport;

/**
 * Reader community (Phase 2) — a Facebook-style feed of book posts.
 *
 * Posts auto-publish. Any reader can report a post; once it collects
 * AUTO_HIDE_AT distinct reports it hides itself, and admins can hide/unhide
 * from the moderation screen.
 */
class CommunityController extends CoreController
{
    /** A post hides itself after this many distinct reports. */
    private const AUTO_HIDE_AT = 5;

    /** Public, paginated feed of published posts. */
    public function feed(Request $request)
    {
        $limit = min((int) $request->input('limit', 10), 30);
        $posts = CommunityPost::query()
            ->where('status', 'published')
            ->with(['user:id,name', 'product:id,name,slug,image'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->paginate($limit);

        $liked = $this->likedIds($request, $posts->pluck('id'));

        $posts->getCollection()->transform(
            fn ($p) => $this->shapePost($p, $liked)
        );

        return $posts;
    }

    /** Create a post (text and/or photos, optionally tagged to a book). */
    public function storePost(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }
        $data = $request->validate([
            'body'       => 'nullable|string|max:5000',
            'photos'     => 'nullable|array|max:6',
            'product_id' => 'nullable|integer',
        ]);
        if (empty(trim($data['body'] ?? '')) && empty($data['photos'])) {
            return ['status' => 'fail', 'message' => 'লেখা বা ছবি অন্তত একটি দিন'];
        }

        $post = CommunityPost::create([
            'user_id'    => $user->id,
            'body'       => $data['body'] ?? null,
            'photos'     => $data['photos'] ?? null,
            'product_id' => $data['product_id'] ?? null,
            'status'     => 'published',
        ]);

        $post->load(['user:id,name', 'product:id,name,slug,image'])
            ->loadCount(['likes', 'comments']);

        return ['status' => 'success', 'data' => $this->shapePost($post, [])];
    }

    /** Delete own post. */
    public function deletePost(Request $request, $id)
    {
        $user = $request->user();
        $post = CommunityPost::find($id);
        if (!$post) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }
        if (!$user || $post->user_id !== $user->id) {
            return ['status' => 'fail', 'message' => 'Not allowed'];
        }
        $post->delete();
        return ['status' => 'success'];
    }

    /** Toggle a like on a post. */
    public function toggleLike(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }
        if (!CommunityPost::whereKey($id)->exists()) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }

        $existing = CommunityPostLike::where('post_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            CommunityPostLike::create(['post_id' => $id, 'user_id' => $user->id]);
            $liked = true;
        }

        return [
            'status'      => 'success',
            'liked'       => $liked,
            'likes_count' => CommunityPostLike::where('post_id', $id)->count(),
        ];
    }

    /** Comments on a post. */
    public function comments($id)
    {
        $comments = CommunityComment::where('post_id', $id)
            ->with('user:id,name')
            ->orderBy('id')
            ->get()
            ->map(fn ($c) => [
                'id'         => (int) $c->id,
                'body'       => $c->body,
                'user'       => $c->user ? ['id' => $c->user->id, 'name' => $c->user->name] : null,
                'created_at' => $c->created_at,
            ]);

        return ['status' => 'success', 'data' => $comments];
    }

    public function storeComment(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }
        $data = $request->validate(['body' => 'required|string|max:2000']);
        if (!CommunityPost::whereKey($id)->exists()) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }

        $c = CommunityComment::create([
            'post_id' => $id,
            'user_id' => $user->id,
            'body'    => trim($data['body']),
        ]);

        return [
            'status' => 'success',
            'data'   => [
                'id'         => (int) $c->id,
                'body'       => $c->body,
                'user'       => ['id' => $user->id, 'name' => $user->name],
                'created_at' => $c->created_at,
            ],
        ];
    }

    /** Report a post. One report per user; auto-hides past the threshold. */
    public function report(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return ['status' => 'fail', 'message' => 'Unauthenticated'];
        }
        $post = CommunityPost::find($id);
        if (!$post) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }
        $reason = $request->input('reason');

        $report = CommunityPostReport::firstOrCreate(
            ['post_id' => $id, 'user_id' => $user->id],
            ['reason' => $reason]
        );

        if ($report->wasRecentlyCreated) {
            $post->report_count = CommunityPostReport::where('post_id', $id)->count();
            if ($post->report_count >= self::AUTO_HIDE_AT && $post->status === 'published') {
                $post->status = 'hidden';
            }
            $post->save();
        }

        return ['status' => 'success', 'reported' => true];
    }

    // ------------------------------------------------------------- admin (super)

    /** Reported or hidden posts, newest first. */
    public function adminReported(Request $request)
    {
        $onlyHidden = $request->boolean('hidden_only');
        $posts = CommunityPost::query()
            ->when(
                $onlyHidden,
                fn ($q) => $q->where('status', 'hidden'),
                fn ($q) => $q->where('report_count', '>', 0)->orWhere('status', 'hidden')
            )
            ->with(['user:id,name', 'product:id,name,slug,image', 'reports.user:id,name'])
            ->withCount(['likes', 'comments'])
            ->orderByDesc('report_count')
            ->latest()
            ->paginate(20);

        $posts->getCollection()->transform(function ($p) {
            $row = $this->shapePost($p, []);
            $row['report_count'] = (int) $p->report_count;
            $row['status'] = $p->status;
            $row['reports'] = $p->reports->map(fn ($r) => [
                'user'   => $r->user?->name,
                'reason' => $r->reason,
            ])->values();
            return $row;
        });

        return $posts;
    }

    public function adminSetStatus(Request $request, $id)
    {
        $post = CommunityPost::find($id);
        if (!$post) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }
        $status = $request->input('status') === 'published' ? 'published' : 'hidden';
        $post->update(['status' => $status]);
        return ['status' => 'success', 'post_status' => $status];
    }

    public function adminDeletePost($id)
    {
        $post = CommunityPost::find($id);
        if (!$post) {
            return ['status' => 'fail', 'message' => 'Post not found'];
        }
        $post->delete();
        return ['status' => 'success'];
    }

    // ------------------------------------------------------------------ helpers

    /** Ids among $postIds that the current user has liked. */
    private function likedIds(Request $request, $postIds): array
    {
        $user = $request->user();
        if (!$user || $postIds->isEmpty()) {
            return [];
        }
        return CommunityPostLike::where('user_id', $user->id)
            ->whereIn('post_id', $postIds)
            ->pluck('post_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function shapePost(CommunityPost $p, array $likedIds): array
    {
        $book = null;
        if ($p->relationLoaded('product') && $p->product) {
            $img = is_array($p->product->image) ? $p->product->image : (array) $p->product->image;
            $book = [
                'id'    => (int) $p->product->id,
                'name'  => $p->product->name,
                'slug'  => $p->product->slug,
                'image' => $img['original'] ?? ($img['thumbnail'] ?? null),
            ];
        }

        return [
            'id'             => (int) $p->id,
            'body'           => $p->body,
            'photos'         => $p->photos ?? [],
            'created_at'     => $p->created_at,
            'user'           => $p->relationLoaded('user') && $p->user
                ? ['id' => $p->user->id, 'name' => $p->user->name]
                : null,
            'book'           => $book,
            'likes_count'    => (int) ($p->likes_count ?? 0),
            'comments_count' => (int) ($p->comments_count ?? 0),
            'my_liked'       => in_array((int) $p->id, $likedIds, true),
        ];
    }
}
