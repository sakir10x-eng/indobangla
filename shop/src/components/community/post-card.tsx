import { useState } from 'react';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { useUser } from '@/framework/user';
import {
  useToggleLike,
  usePostComments,
  useAddPostComment,
  useReportPost,
  useDeletePost,
  type CommunityPost,
} from '@/framework/community';

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'এইমাত্র';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} দিন আগে`;
  return new Date(iso).toLocaleDateString();
}

export default function PostCard({ post }: { post: CommunityPost }) {
  const { me } = useUser();
  const { toggleLike } = useToggleLike();
  const { reportPost } = useReportPost();
  const { deletePost } = useDeletePost();
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState('');
  const { comments, isLoading } = usePostComments(post.id, showComments);
  const { addComment, isAdding } = useAddPostComment(post.id);

  const isOwn = me?.id === post.user?.id;
  const initial = (post.user?.name || '?').charAt(0).toUpperCase();

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    addComment(v, { onSuccess: () => setText('') });
  };

  return (
    <article className="rounded-xl border border-border-200 bg-light p-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
          {initial}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-heading">
            {post.user?.name || 'একজন পাঠক'}
          </p>
          <p className="text-[11px] text-body">{timeAgo(post.created_at)}</p>
        </div>
        {isOwn && (
          <button
            onClick={() => {
              if (confirm('পোস্টটি মুছে ফেলবেন?')) deletePost(post.id);
            }}
            className="text-[12px] text-body hover:text-red-500"
          >
            মুছুন
          </button>
        )}
      </div>

      {/* book tag */}
      {post.book && (
        <Link
          href={Routes.product(post.book.slug)}
          className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2 hover:bg-gray-100"
        >
          {post.book.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.book.image}
              alt={post.book.name}
              className="h-12 w-9 rounded object-cover"
            />
          )}
          <span className="text-[13px] font-medium text-heading">
            📖 {post.book.name}
          </span>
        </Link>
      )}

      {/* body */}
      {post.body && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-body-dark">
          {post.body}
        </p>
      )}

      {/* photos */}
      {post.photos?.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {post.photos.map((ph, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={ph.original || ph.thumbnail}
              alt=""
              loading="lazy"
              className="max-h-96 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* action bar */}
      <div className="mt-3 flex items-center gap-5 border-t border-border-200 pt-2 text-[13px]">
        <button
          onClick={() => toggleLike(post.id)}
          className={`flex items-center gap-1.5 font-medium transition-colors ${
            post.my_liked ? 'text-accent' : 'text-body hover:text-accent'
          }`}
        >
          {post.my_liked ? '❤️' : '🤍'} {post.likes_count}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 font-medium text-body hover:text-accent"
        >
          💬 {post.comments_count}
        </button>
        {!isOwn && (
          <button
            onClick={() => {
              if (confirm('এই পোস্টটি রিপোর্ট করবেন?'))
                reportPost({ id: post.id });
            }}
            className="ml-auto text-[12px] text-body hover:text-red-500"
          >
            রিপোর্ট
          </button>
        )}
      </div>

      {/* comments */}
      {showComments && (
        <div className="mt-3 border-t border-dashed border-border-200 pt-3">
          {isLoading ? (
            <p className="text-xs text-body">লোড হচ্ছে…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-body">প্রথম মন্তব্যটি করুন।</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c: any) => (
                <li key={c.id} className="text-sm">
                  <span className="font-medium text-heading">
                    {c.user?.name || 'পাঠক'}:
                  </span>{' '}
                  <span className="text-body-dark">{c.body}</span>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submitComment} className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="একটি মন্তব্য লিখুন…"
              className="flex-1 rounded border border-border-200 px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAdding || !text.trim()}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-light disabled:opacity-50"
            >
              পাঠান
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
