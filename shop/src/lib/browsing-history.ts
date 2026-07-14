// Lightweight client-side browsing history for personalized home rails.
const KEY = 'ib-browsing-history';
const MAX = 20;

export type ViewedBook = {
  id: number | string;
  slug: string;
  name: string;
  image?: string;
  category?: string; // primary category slug
  price?: number;
  sale_price?: number;
};

export function recordView(book: ViewedBook) {
  if (typeof window === 'undefined' || !book?.slug) return;
  try {
    const list: ViewedBook[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const next = [book, ...list.filter((b) => String(b.id) !== String(book.id))].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getHistory(): ViewedBook[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

/** Most frequently seen category slug across the browsing history. */
export function topCategory(): string | null {
  const hist = getHistory();
  const counts: Record<string, number> = {};
  hist.forEach((b) => {
    if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}
