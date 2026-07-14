import usePrice from "@/utils/use-price";


export const PriceCell = ({ price }: { price: number }) => {
  const { price: displayPrice } = usePrice({ amount: price });
  return <span>{displayPrice}</span>;
};