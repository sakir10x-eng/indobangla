import { NextSeo, NextSeoProps } from 'next-seo';
interface SeoProps extends NextSeoProps {
  url?: string;
  images?: any[] | null;
}
const Seo = ({ title, description, images, url, ...props }: SeoProps) => {
  return (
    <NextSeo
      title={title}
      openGraph={{
        ...(Boolean(url) && {
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/${url}`,
        }),
        title,
        description,
        ...(Boolean(images) && {
          // Callers pass two different shapes: banners are `{image:{original}, title}`,
          // while a product/flash-sale cover is a raw attachment `{original, thumbnail}`.
          // Reading only `item.image.original` left product/flash-sale og:image EMPTY —
          // which is exactly why shared product links showed no preview picture. Resolve
          // from either shape and drop any entry with no URL so we never emit a blank tag.
          images: images
            ?.map((item) => ({
              url: item?.image?.original ?? item?.original ?? item?.url,
              alt: item?.title ?? item?.alt ?? title,
            }))
            .filter((img) => Boolean(img.url)),
        }),
      }}
      {...props}
    />
  );
};

export default Seo;
