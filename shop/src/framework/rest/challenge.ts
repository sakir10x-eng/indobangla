import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import client from './client';

export const CHALLENGE_STATUS_KEY = 'challenge/status';
/** The running tab's token. A second tab won't have it, and the server rejects it anyway. */
export const CHALLENGE_TOKEN_KEY = 'ib_challenge_token';
/** Handed to the checkout page so the earned discount applies itself. */
export const CHALLENGE_COUPON_KEY = 'ib_challenge_coupon';
/** Whatever was in the cart before the minute started, parked until the order is done. */
export const CHALLENGE_STASH_KEY = 'ib_cart_stash';

const err = (e: any, fallback: string) =>
  toast.error(
    e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || fallback,
  );

export function useChallengeStatus(enabled: boolean, poll = false) {
  const { data, isLoading, refetch } = useQuery(
    [CHALLENGE_STATUS_KEY],
    () => client.challenge.status(),
    { enabled, retry: false, refetchInterval: poll ? 15000 : false },
  );
  return { status: data as any, isLoading, refetch };
}

export function useStartChallenge() {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(client.challenge.start, {
    onSuccess: (data: any) => {
      if (data?.errors?.length) {
        toast.error(data.errors[0]?.message ?? 'শুরু করা গেল না');
        return;
      }
      localStorage.setItem(CHALLENGE_TOKEN_KEY, data.token);
      queryClient.invalidateQueries([CHALLENGE_STATUS_KEY]);
    },
    onError: (e: any) => err(e, 'চ্যালেঞ্জ শুরু করা গেল না'),
  });
  return { startChallenge: mutate, isStarting: isLoading };
}

export function useAddToChallenge() {
  const queryClient = useQueryClient();
  const { mutateAsync, isLoading } = useMutation(client.challenge.add, {
    onSuccess: () => queryClient.invalidateQueries([CHALLENGE_STATUS_KEY]),
    onError: (e: any) => err(e, 'বইটি গোনা গেল না'),
  });
  return { addToChallenge: mutateAsync, isAdding: isLoading };
}

export function useFinishChallenge() {
  const queryClient = useQueryClient();
  const { mutateAsync, isLoading } = useMutation(client.challenge.finish, {
    onSuccess: (data: any) => {
      if (data?.code) {
        // Checkout picks this up and applies it without the customer typing anything.
        localStorage.setItem(CHALLENGE_COUPON_KEY, data.code);
      }
      localStorage.removeItem(CHALLENGE_TOKEN_KEY);
      queryClient.invalidateQueries([CHALLENGE_STATUS_KEY]);
    },
    onError: (e: any) => err(e, 'চ্যালেঞ্জ শেষ করা গেল না'),
  });
  return { finishChallenge: mutateAsync, isFinishing: isLoading };
}

export const challengeToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem(CHALLENGE_TOKEN_KEY);
