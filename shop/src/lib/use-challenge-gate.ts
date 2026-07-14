import { toast } from 'react-toastify';
import { useUser } from '@/framework/user';
import {
  useChallengeStatus,
  useAddToChallenge,
  challengeToken,
} from '@/framework/challenge';

/**
 * The rules of the 1-minute challenge, in one place.
 *
 * While a run is live, a book only counts if it was added from its own product page —
 * not from a wishlist, a bundle strip, or a listing grid. Every other add-to-cart button
 * on the site asks this hook first, and is turned away.
 *
 * The server enforces the same rules (see IntegrationController::challengeAdd); this is
 * here so the customer is told why, rather than silently getting nothing.
 */
export function useChallengeGate() {
  const { isAuthorized } = useUser();
  const { status } = useChallengeStatus(isAuthorized);
  const { addToChallenge } = useAddToChallenge();

  const live = Boolean(status?.active) && (status?.active?.seconds_left ?? 0) > 0;

  /**
   * Call before putting anything in the cart.
   * `source` is 'product' only on a single book's own page.
   * Returns false when the add must not happen.
   */
  async function guardAdd(
    source: 'product' | 'list' | 'wishlist' | 'bundle',
    productId?: string | number,
    pageKey?: string,
  ): Promise<boolean> {
    if (!live) return true; // not playing — normal shopping

    if (source !== 'product') {
      toast.error(
        'চ্যালেঞ্জ চলাকালীন বইয়ের নিজস্ব পেজ থেকে যোগ করতে হবে — উইশলিস্ট, বান্ডল বা লিস্ট থেকে নয়।',
      );
      return false;
    }

    const token = challengeToken();
    if (!token || !productId) return false;

    try {
      // Counted on the server first. If it refuses (duplicate page, time up), the book
      // does not go in the cart either — the cart must never show more than we counted.
      await addToChallenge({ product_id: productId, token, source, page_key: pageKey });
      return true;
    } catch {
      return false;
    }
  }

  return { challengeLive: live, guardAdd };
}
