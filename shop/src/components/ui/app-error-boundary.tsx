import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * App-level error boundary. Any render-time throw on a page (a malformed API payload feeding
 * `.map`, an unguarded `.toLowerCase()` on a null field, etc.) is contained to a graceful
 * "something went wrong" panel instead of white-screening the whole route.
 */
export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <h2 className="mb-2 text-lg font-semibold text-heading">
            কিছু একটা সমস্যা হয়েছে
          </h2>
          <p className="mb-5 text-sm text-body">
            পেজটি দেখাতে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload();
            }}
            className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white"
          >
            আবার লোড করুন
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
