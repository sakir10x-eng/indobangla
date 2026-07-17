import { HttpClient } from '@/framework/client/http-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Client-only: renders inside the app (cart context via _app) but with its own
// immersive chrome. Safe with the root `[[...pages]]` catch-all because it is a
// NESTED dynamic route (like pay/[token]) — no top-level static page collision.
const ProductLanding = dynamic(
  () => import('@/components/landing/product-landing'),
  { ssr: false },
);

export default function LandingSlugPage() {
  const router = useRouter();
  const slug = router.query.slug as string;
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        const r = await HttpClient.get<any>('landing-page', { slug });
        if (!alive) return;
        if (r?.enabled && r?.product) {
          setData(r);
          setState('ready');
        } else {
          setState('missing');
        }
      } catch {
        if (alive) setState('missing');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif", color: '#6b7773' }}>
        লোড হচ্ছে…
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif", color: '#241a14' }}>
        <div>
          <div style={{ fontSize: 44 }}>📕</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '12px 0 6px' }}>ল্যান্ডিং পেজটি খুঁজে পাওয়া যায়নি</h1>
          <p style={{ color: '#6b7773', fontSize: 14 }}>এই পণ্যের জন্য কোনো সক্রিয় ল্যান্ডিং পেজ নেই।</p>
          {slug && (
            <a href={`/products/${slug}`} style={{ display: 'inline-block', marginTop: 16, background: '#c0202c', color: '#fff', fontWeight: 700, padding: '11px 22px', borderRadius: 10, textDecoration: 'none' }}>
              পণ্যের পেজ দেখুন →
            </a>
          )}
        </div>
      </div>
    );
  }

  return <ProductLanding data={data} />;
}
