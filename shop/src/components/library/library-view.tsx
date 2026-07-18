import { useMyLibrary } from '@/framework/library';
import BookStrip from './book-strip';
import ReviewCard from './review-card';
import AwardShowcase from './award-showcase';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border-200 bg-light py-4">
      <span className="text-2xl font-bold text-accent">{value}</span>
      <span className="mt-1 text-xs text-body">{label}</span>
    </div>
  );
}

export default function LibraryView() {
  const { library, isLoading, error } = useMyLibrary();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-body">
        লাইব্রেরি লোড হচ্ছে…
      </div>
    );
  }

  if (error || !library || library.status !== 'success') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-body">
        লাইব্রেরি লোড করা গেল না। একটু পরে আবার চেষ্টা করুন।
      </div>
    );
  }

  const stats = library.my_review_stats;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-heading">আমার লাইব্রেরি</h1>
        <p className="mt-1 text-sm text-body">
          আপনার বই, রিভিউ, পুরস্কার আর পছন্দের নতুন বই — সব এক জায়গায়।
        </p>
      </div>

      {/* My review stats */}
      <section className="mb-8">
        <h3 className="mb-3 text-base font-semibold text-heading">
          আমার রিভিউ অ্যাক্টিভিটি
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="রিভিউ" value={stats.total_reviews} />
          <StatTile label="মোট পঠিত" value={stats.total_reads} />
          <StatTile label="মোট লাইক" value={stats.total_likes} />
          <StatTile label="মোট মন্তব্য" value={stats.total_comments} />
        </div>

        {stats.reviews.length > 0 && (
          <div className="mt-4 space-y-3">
            {stats.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>

      {/* My books */}
      <BookStrip
        title="আমার বই"
        subtitle="আপনার অর্ডার করা সব বই"
        books={library.my_books}
        emptyText="আপনি এখনও কোনো বই অর্ডার করেননি।"
      />

      {/* Reviews others left on my books */}
      {library.reviews_on_books.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-3 text-base font-semibold text-heading">
            আপনার বই নিয়ে অন্যদের রিভিউ
          </h3>
          <div className="space-y-3">
            {library.reviews_on_books.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      <AwardShowcase awards={library.awards} />

      {/* Offers */}
      <BookStrip
        title="🔥 চলতি অফার"
        books={library.offers}
        emptyText="এখন কোনো অফার নেই।"
      />

      {/* Recommendations */}
      <BookStrip
        title="আপনার জন্য"
        subtitle="আপনার পছন্দের ধরন ও লেখক অনুযায়ী"
        books={library.recommendations}
        emptyText="আরও বই অর্ডার করলে সুপারিশ দেখাবে।"
      />

      {/* New arrivals */}
      <BookStrip
        title="নতুন বই"
        books={library.new_arrivals}
        emptyText="নতুন বই আসছে শীঘ্রই।"
      />
    </div>
  );
}
