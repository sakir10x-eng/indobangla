import React from 'react';

/**
 * Keeps a render/hydration error inside the book-search view from white-screening the whole
 * page. Instead of Next's generic "Application error", it shows a friendly fallback with a way
 * to keep shopping — and prints the real error to the console for debugging.
 */
type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class SearchErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: String(error?.message || error) };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[book-search] render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback as any;
      return (
        <div className="w-full py-16 text-center">
          <div className="text-4xl">📚</div>
          <p className="mt-3 text-base font-semibold text-heading">
            এই মুহূর্তে সার্চ ফলাফল দেখানো যাচ্ছে না
          </p>
          <p className="mt-1 text-sm text-body">একটু পরে আবার চেষ্টা করুন, অথবা সব বই ব্রাউজ করুন।</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-white"
            >
              আবার চেষ্টা করুন
            </button>
            <a
              href="/products"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              সব বই দেখুন
            </a>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
