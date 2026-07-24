import { Shop } from '@/types';
import isEmpty from 'lodash/isEmpty';
interface Item {
  id: string | number;
  name: string;
  slug: string;
  image: {
    thumbnail: string;
    [key: string]: unknown;
  };
  price: number;
  sale_price?: number;
  quantity?: number;
  [key: string]: unknown;
  language: string;
  in_flash_sale: boolean;
  shop: Shop;
}
interface Variation {
  id: string | number;
  title: string;
  price: number;
  sale_price?: number;
  quantity: number;
  [key: string]: unknown;
}
export function generateCartItem(item: Item, variation: Variation) {
  const {
    id,
    name,
    slug,
    image,
    price,
    sale_price,
    quantity,
    unit,
    is_digital,
    language,
    in_flash_sale,
    shop,
    is_preorder,
    preorder_advance_pct,
    preorder_full_pay_discount_pct,
    is_resell,
    is_ebook,
  } = item;
  if (!isEmpty(variation)) {
    return {
      id: `${id}.${variation.id}`,
      productId: id,
      name: `${name} - ${variation.title}`,
      slug,
      unit,
      is_digital: variation?.is_digital,
      stock: variation.quantity,
      price: Number(
        variation.sale_price ? variation.sale_price : variation.price,
      ),
      mrp: Number(variation.price),
      image: image?.thumbnail,
      variationId: variation.id,
      language,
      in_flash_sale,
      shop_id: shop.id,
      is_preorder: Boolean(is_preorder),
      preorder_advance_pct: Number(preorder_advance_pct) || 50,
      preorder_full_pay_discount_pct:
        preorder_full_pay_discount_pct == null
          ? 5
          : Number(preorder_full_pay_discount_pct),
      is_resell: Boolean(is_resell),
      // E-books are prepaid, bKash-only — checkout reads this to drop the other gateways.
      is_ebook: Boolean(is_ebook),
    };
  }
  return {
    id,
    name,
    slug,
    unit,
    is_digital,
    image: image?.thumbnail,
    stock: quantity,
    price: Number(sale_price ? sale_price : price),
    mrp: Number(price),
    language,
    in_flash_sale,
    shop_id: shop?.id,
    is_preorder: Boolean(is_preorder),
    preorder_advance_pct: Number(preorder_advance_pct) || 50,
    preorder_full_pay_discount_pct:
      preorder_full_pay_discount_pct == null
        ? 5
        : Number(preorder_full_pay_discount_pct),
    is_resell: Boolean(is_resell),
    is_ebook: Boolean(is_ebook),
  };
}
