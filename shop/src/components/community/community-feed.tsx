import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import { useUser } from '@/framework/user';
import { useCommunityFeed } from '@/framework/community';
import PostComposer from './post-composer';
import PostCard from './post-card';

export default function CommunityFeed() {
  const { me } = useUser();
  const { posts, isLoading, loadMore, hasMore, isLoadingMore } =
    useCommunityFeed();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-heading">পাঠক কমিউনিটি</h1>
        <p className="mt-1 text-sm text-body">
          আপনার পড়া বই নিয়ে পোস্ট করুন, অন্য পাঠকদের সাথে যুক্ত হন।
        </p>
      </div>

      {me ? (
        <PostComposer />
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-border-200 bg-gray-50 px-4 py-5 text-center text-sm text-body">
          পোস্ট করতে{' '}
          <Link
            href={(Routes as any).login ?? '/'}
            className="font-semibold text-accent"
          >
            লগইন
          </Link>{' '}
          করুন।
        </div>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-body">লোড হচ্ছে…</p>
      ) : posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-body">
          এখনও কোনো পোস্ট নেই — প্রথম পোস্টটি আপনিই করুন!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            className="rounded-lg border border-border-200 px-6 py-2 text-sm font-medium text-heading hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {isLoadingMore ? 'লোড হচ্ছে…' : 'আরও দেখুন'}
          </button>
        </div>
      )}
    </div>
  );
}
