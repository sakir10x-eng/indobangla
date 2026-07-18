import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import client from './client';

export const MY_LIBRARY_KEY = 'my-library';
export const REVIEW_COMMENTS_KEY = 'review-comments';

export type LibraryBook = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  sale_price: number | null;
  author: string | null;
  ratings: number | null;
  total_reviews: number | null;
};

export type LibraryReview = {
  id: number;
  rating: number;
  comment: string | null;
  photos: any;
  reads: number;
  likes: number;
  comments_count: number;
  created_at: string;
  user: { id: number; name: string } | null;
  product: LibraryBook | null;
};

export type LibraryAward = {
  id: number;
  title: string;
  year: number | null;
  description: string | null;
  image: string | null;
  books: LibraryBook[];
};

export type MyLibrary = {
  status: string;
  my_books: LibraryBook[];
  reviews_on_books: LibraryReview[];
  new_arrivals: LibraryBook[];
  awards: LibraryAward[];
  offers: LibraryBook[];
  recommendations: LibraryBook[];
  my_review_stats: {
    total_reviews: number;
    total_reads: number;
    total_likes: number;
    total_comments: number;
    reviews: LibraryReview[];
  };
};

/** The whole My Library payload for the signed-in reader. */
export function useMyLibrary() {
  const { data, isLoading, error, refetch } = useQuery<MyLibrary, Error>(
    [MY_LIBRARY_KEY],
    () => client.library.get(),
    { retry: false, refetchOnWindowFocus: false },
  );
  return { library: data, isLoading, error, refetch };
}

/** Comments on a single review — fetched lazily when the thread is opened. */
export function useReviewComments(id: number, enabled: boolean) {
  const { data, isLoading, refetch } = useQuery(
    [REVIEW_COMMENTS_KEY, id],
    () => client.library.reviewComments(id),
    { enabled, retry: false },
  );
  return { comments: (data as any)?.data ?? [], isLoading, refetch };
}

export function useAddReviewComment(id: number) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(
    (comment: string) => client.library.addReviewComment({ id, comment }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([REVIEW_COMMENTS_KEY, id]);
        queryClient.invalidateQueries([MY_LIBRARY_KEY]);
      },
      onError: () => toast.error('মন্তব্য যোগ করা গেল না'),
    },
  );
  return { addComment: mutate, isAdding: isLoading };
}

/** Bump a review's read counter (fire-and-forget). */
export function markReviewViewed(id: number) {
  client.library.markReviewViewed(id).catch(() => {});
}
