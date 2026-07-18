import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query';
import { toast } from 'react-toastify';
import client from './client';

export const COMMUNITY_FEED_KEY = 'community-feed';
export const POST_COMMENTS_KEY = 'post-comments';

export type CommunityBook = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
};

export type CommunityPost = {
  id: number;
  body: string | null;
  photos: { original?: string; thumbnail?: string }[];
  created_at: string;
  user: { id: number; name: string } | null;
  book: CommunityBook | null;
  likes_count: number;
  comments_count: number;
  my_liked: boolean;
};

/** Paginated feed with "load more". */
export function useCommunityFeed(limit = 10) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      [COMMUNITY_FEED_KEY],
      ({ pageParam = 1 }) => client.community.feed({ page: pageParam, limit }),
      {
        getNextPageParam: (last: any) =>
          last?.current_page < last?.last_page
            ? last.current_page + 1
            : undefined,
        refetchOnWindowFocus: false,
      },
    );

  const posts: CommunityPost[] =
    data?.pages?.flatMap((p: any) => p.data ?? []) ?? [];

  return {
    posts,
    isLoading,
    loadMore: fetchNextPage,
    hasMore: Boolean(hasNextPage),
    isLoadingMore: isFetchingNextPage,
  };
}

const err = (e: any, fallback: string) =>
  toast.error(e?.response?.data?.message || fallback);

export function useCreatePost() {
  const qc = useQueryClient();
  const { mutate, isLoading } = useMutation(client.community.createPost, {
    onSuccess: (res: any) => {
      if (res?.status === 'fail') {
        toast.error(res.message || 'পোস্ট করা গেল না');
        return;
      }
      toast.success('পোস্ট হয়েছে');
      qc.invalidateQueries([COMMUNITY_FEED_KEY]);
    },
    onError: (e: any) => err(e, 'পোস্ট করা গেল না'),
  });
  return { createPost: mutate, isCreating: isLoading };
}

export function useDeletePost() {
  const qc = useQueryClient();
  const { mutate } = useMutation(client.community.deletePost, {
    onSuccess: () => {
      toast.success('পোস্ট মুছে ফেলা হয়েছে');
      qc.invalidateQueries([COMMUNITY_FEED_KEY]);
    },
    onError: (e: any) => err(e, 'মুছে ফেলা গেল না'),
  });
  return { deletePost: mutate };
}

/** Optimistic like toggle across the cached feed pages. */
export function useToggleLike() {
  const qc = useQueryClient();
  const { mutate } = useMutation(client.community.toggleLike, {
    onMutate: async (id: string | number) => {
      await qc.cancelQueries([COMMUNITY_FEED_KEY]);
      const prev = qc.getQueryData<any>([COMMUNITY_FEED_KEY]);
      qc.setQueryData<any>([COMMUNITY_FEED_KEY], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((pg: any) => ({
            ...pg,
            data: pg.data.map((p: CommunityPost) =>
              p.id === Number(id)
                ? {
                    ...p,
                    my_liked: !p.my_liked,
                    likes_count: p.likes_count + (p.my_liked ? -1 : 1),
                  }
                : p,
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _id, ctx: any) => {
      if (ctx?.prev) qc.setQueryData([COMMUNITY_FEED_KEY], ctx.prev);
      toast.error('লাইক করা গেল না');
    },
  });
  return { toggleLike: mutate };
}

export function usePostComments(id: number, enabled: boolean) {
  const { data, isLoading } = useQuery(
    [POST_COMMENTS_KEY, id],
    () => client.community.comments(id),
    { enabled, retry: false },
  );
  return { comments: (data as any)?.data ?? [], isLoading };
}

export function useAddPostComment(id: number) {
  const qc = useQueryClient();
  const { mutate, isLoading } = useMutation(
    (body: string) => client.community.addComment({ id, body }),
    {
      onSuccess: () => {
        qc.invalidateQueries([POST_COMMENTS_KEY, id]);
        qc.invalidateQueries([COMMUNITY_FEED_KEY]);
      },
      onError: (e: any) => err(e, 'মন্তব্য যোগ করা গেল না'),
    },
  );
  return { addComment: mutate, isAdding: isLoading };
}

export function useReportPost() {
  const { mutate } = useMutation(client.community.report, {
    onSuccess: () => toast.success('রিপোর্ট করা হয়েছে, ধন্যবাদ'),
    onError: (e: any) => err(e, 'রিপোর্ট করা গেল না'),
  });
  return { reportPost: mutate };
}

export function useBookSearch(q: string) {
  const { data, isFetching } = useQuery(
    ['community-book-search', q],
    () => client.community.searchBooks(q),
    { enabled: q.trim().length > 1, keepPreviousData: true },
  );
  return { results: (data as any)?.products ?? [], searching: isFetching };
}
