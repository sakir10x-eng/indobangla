import ContentLoader from 'react-content-loader';

const ProductListLoader = (props: any) => (
  <ContentLoader
    width={'100%'}
    height={'100%'}
    speed={1}
    backgroundColor="#e0e0e0"
    foregroundColor="#cecece"
    viewBox="0 0 380 130"
    {...props}
  >
    <rect x="0" y="0" rx="5" ry="5" width="180" height="130" />
    <rect x="190" y="17" rx="4" ry="4" width="180" height="13" />
    <rect x="190" y="40" rx="3" ry="3" width="160" height="10" />
    <rect x="190" y="60" rx="3" ry="3" width="140" height="10" />
  </ContentLoader>
);

export default ProductListLoader;
