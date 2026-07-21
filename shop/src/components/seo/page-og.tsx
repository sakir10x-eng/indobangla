import Head from 'next/head';

/**
 * Server-rendered Open Graph tags for link previews (WhatsApp / Facebook / Twitter).
 *
 * Why this exists: the per-page `<Seo>` lives inside `<Maintenance>` in _app, which renders
 * a <Spinner/> during SSR (settings load client-side). So the product page's own SEO never
 * reaches the server HTML a crawler reads — only `<DefaultSeo/>` (which sits outside
 * Maintenance) does, and its og:image is empty. This component is rendered in _app OUTSIDE
 * Maintenance, straight from `pageProps` (getStaticProps provides `product` at build/SSR time),
 * so the real cover, title and description are in the HTML crawlers actually fetch.
 */
export default function PageOg({ pageProps }: { pageProps: any }) {
  const product = pageProps?.product;
  if (!product) return null;

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://indobangla.bd').replace(/\/$/, '');
  const image = product?.image?.original || product?.image?.thumbnail || '';
  const title = product?.name ? String(product.name) : '';
  const url = product?.slug ? `${site}/products/${product.slug}` : site;
  const description = String(product?.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  // key= lets next/head dedupe: our valid tag replaces DefaultSeo's empty og:image.
  return (
    <Head>
      {title && <meta key="og:title" property="og:title" content={title} />}
      {description && (
        <meta key="og:description" property="og:description" content={description} />
      )}
      <meta key="og:type" property="og:type" content="product" />
      <meta key="og:url" property="og:url" content={url} />
      {image && <meta key="og:image" property="og:image" content={image} />}
      {image && <meta key="og:image:secure_url" property="og:image:secure_url" content={image} />}
      {title && <meta key="twitter:title" name="twitter:title" content={title} />}
      {description && (
        <meta key="twitter:description" name="twitter:description" content={description} />
      )}
      {image && <meta key="twitter:image" name="twitter:image" content={image} />}
      {image && <meta key="twitter:card" name="twitter:card" content="summary_large_image" />}
    </Head>
  );
}
