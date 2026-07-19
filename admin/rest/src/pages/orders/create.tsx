import Layout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import cn from 'classnames';
import omit from 'lodash/omit';

import { useCart } from '@/contexts/quick-cart/cart.context';
import { generateCartItem } from '@/contexts/quick-cart/generate-cart-item';
import {
  calculateTotal,
} from '@/contexts/quick-cart/cart.utils';
import { formatOrderedProduct } from '@/utils/format-ordered-product';
import { useProductsQuery } from '@/data/product';
import { userClient } from '@/data/client/user';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';
import { useVerifyCheckoutMutation } from '@/data/checkout';
import { useVerifyCouponMutation } from '@/data/coupon';
import { ProductStatus } from '@/types';
import AreaPicker from '@/components/address/area-picker';
import { PlaceOrderAction } from '@/components/checkout/place-order-action';
import {
  customerAtom,
  customerContactAtom,
  shippingAddressAtom,
  deliveryTimeAtom,
  paymentGatewayAtom,
  verifiedResponseAtom,
  couponAtom,
  walletAtom,
  manualDiscountAtom,
  adjustmentAtom,
  advancePaidAtom,
  orderNoteAtom,
  clearCheckoutAtom,
} from '@/contexts/checkout';

const tk = (n: number) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

function addrLine(a: any) {
  if (!a) return '';
  const x = a.address ?? a;
  return [x?.street_address, x?.city, x?.state, x?.zip, x?.country]
    .filter(Boolean)
    .join(', ');
}

const PAYMENTS: { value: 'CASH' | 'CASH_ON_DELIVERY'; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CASH_ON_DELIVERY', label: 'Cash on delivery' },
];

export default function CreateOrderPage() {
  const { locale } = useRouter();

  const {
    items,
    addItemToCart,
    removeItemFromCart,
    clearItemFromCart,
    resetCart,
  } = useCart() as any;
  const [refreshing, setRefreshing] = useState(false);
  // Re-pull each cart line's live product (price / stock / name) so an edit made in
  // another tab shows up here without rebuilding the order. Quantities are preserved.
  async function refreshItems() {
    if (!items?.length || refreshing) return;
    setRefreshing(true);
    try {
      const fresh: { item: any; qty: number }[] = [];
      for (const it of items) {
        try {
          const p: any = await HttpClient.get(`products/${it.slug}`, {
            language: locale,
          });
          fresh.push({ item: generateCartItem(p, {} as any), qty: it.quantity });
        } catch {
          fresh.push({ item: it, qty: it.quantity });
        }
      }
      resetCart();
      fresh.forEach((f) => addItemToCart(f.item, f.qty));
    } finally {
      setRefreshing(false);
    }
  }

  // ---- checkout atoms (feed the tested PlaceOrderAction payload) ----
  const [customer, setCustomer] = useAtom(customerAtom);
  const [contact, setContact] = useAtom(customerContactAtom);
  // ---- quick add-customer (when the buyer isn't in the system yet) ----
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [shipping, setShipping] = useAtom(shippingAddressAtom);
  const [, setDeliveryT] = useAtom(deliveryTimeAtom);
  const [pay, setPay] = useAtom(paymentGatewayAtom);
  const [verified, setVerified] = useAtom(verifiedResponseAtom);
  const [coupon, setCoupon] = useAtom(couponAtom);
  const [useWallet, toggleWallet] = useAtom(walletAtom);
  const [manualDiscount, setManualDiscount] = useAtom(manualDiscountAtom);
  const [adjustment, setAdjustment] = useAtom(adjustmentAtom);
  const [advancePaid, setAdvancePaid] = useAtom(advancePaidAtom);
  const [note, setNote] = useAtom(orderNoteAtom);
  const [, clearCheckout] = useAtom(clearCheckoutAtom);

  // Start every visit to the POS with a clean slate. The checkout state is persisted in
  // localStorage, so without this the previous buyer's name / contact / address / advance
  // (and a stale cart) would linger into the next order. Runs once per mount.
  const didReset = useRef(false);
  useEffect(() => {
    if (didReset.current) return;
    didReset.current = true;
    clearCheckout();
    resetCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- local UI state ----
  const [custQ, setCustQ] = useState('');
  const [custRes, setCustRes] = useState<any[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [custBusy, setCustBusy] = useState(false);
  const [fullCust, setFullCust] = useState<any>(null);

  const [bookQ, setBookQ] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [bookLimit, setBookLimit] = useState(20);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponIn, setCouponIn] = useState('');
  const [couponErr, setCouponErr] = useState('');

  // ---- delivery (admin controlled) ----
  type Courier = 'RedX' | 'Sundharban' | 'Pickup by customer';
  const [deliveryBy, setDeliveryBy] = useState<Courier>('RedX');
  const [area, setArea] = useState<'inside' | 'outside'>('inside');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(60);

  // ---- order drafts: park the unplaced order, reopen it from the header ----
  const [drafts, setDrafts] = useState<any[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  async function loadDrafts() {
    try {
      const r: any = await HttpClient.get('order-drafts');
      setDrafts(r?.drafts ?? []);
    } catch {}
  }
  useEffect(() => {
    loadDrafts();
  }, []);
  async function saveDraft() {
    if (!items?.length || savingDraft) return;
    setSavingDraft(true);
    try {
      const payload = {
        customer,
        contact,
        shipping,
        pay,
        coupon,
        manual_discount: manualDiscount,
        adjustment,
        advance: advancePaid,
        note,
        delivery: { by: deliveryBy, area, charge: deliveryCharge },
        custQ,
        items: items.map((i: any) => ({ id: i.productId ?? i.id, slug: i.slug, qty: i.quantity })),
      };
      const label = `${(customer as any)?.label || contact || 'খসড়া'} · ${items.length} বই`;
      await HttpClient.post('order-draft', { payload, label });
      toast.success('খসড়া সেভ হয়েছে');
      loadDrafts();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'খসড়া সেভ হয়নি');
    } finally {
      setSavingDraft(false);
    }
  }
  async function loadDraft(id: number) {
    try {
      const r: any = await HttpClient.get(`order-draft/${id}`);
      const p: any = r?.payload || {};
      if (p.customer) setCustomer(p.customer); // sets first — its atom nulls contact/shipping
      setContact(p.contact || '');
      if (p.shipping) setShipping(p.shipping);
      if (p.pay) setPay(p.pay);
      setCoupon(p.coupon ?? null);
      setManualDiscount(Number(p.manual_discount) || 0);
      setAdjustment(Number(p.adjustment) || 0);
      setAdvancePaid(Number(p.advance) || 0);
      setNote(p.note || '');
      if (p.delivery) {
        setDeliveryBy(p.delivery.by || 'RedX');
        setArea(p.delivery.area || 'inside');
        setDeliveryCharge(Number(p.delivery.charge) || 0);
      }
      setCustQ(p.custQ || '');
      resetCart();
      for (const it of p.items || []) {
        try {
          const prod: any = await HttpClient.get(`products/${it.slug}`, { language: locale });
          addItemToCart(generateCartItem(prod, {} as any), Number(it.qty) || 1);
        } catch {}
      }
      toast.success(`খসড়া #${id} খোলা হয়েছে`);
    } catch {
      toast.error('খসড়া খোলা যায়নি');
    }
  }
  const [editAddr, setEditAddr] = useState(false);
  // Raw verify result (tax / unavailable / wallet). Shipping is set by the admin below.
  const [vbase, setVbase] = useState<any>(null);

  const areaCharge = (a: 'inside' | 'outside') => (a === 'inside' ? 60 : 120);
  function chooseCourier(c: Courier) {
    setDeliveryBy(c);
    setDeliveryCharge(c === 'Pickup by customer' ? 0 : areaCharge(area));
  }
  function chooseArea(a: 'inside' | 'outside') {
    setArea(a);
    if (deliveryBy !== 'Pickup by customer') setDeliveryCharge(areaCharge(a));
  }
  function setAddrField(field: string, value: string) {
    const base: any = (shipping as any)?.address ?? {};
    setShipping({
      ...((shipping as any) ?? { title: 'Delivery address', type: 'shipping' }),
      address: { country: 'Bangladesh', ...base, [field]: value },
    } as any);
  }

  const { products: bookHits, paginatorInfo: bookPag } = useProductsQuery(
    {
      limit: bookLimit,
      language: locale,
      status: ProductStatus.Publish,
      name: bookQ,
    },
    { enabled: bookQ.trim().length > 0 }
  );
  // Grow the fetch as the dropdown is scrolled, so every matching book is reachable — not just
  // the first page.
  const bookHasMore = (bookHits?.length ?? 0) < (Number((bookPag as any)?.total) || 0);

  const { mutate: verifyCheckout, isLoading: verifying } =
    useVerifyCheckoutMutation();
  const { mutate: verifyCoupon, isLoading: couponBusy } =
    useVerifyCouponMutation();

  // default payment once
  useEffect(() => {
    if (!pay) setPay('CASH');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Record the courier + area as the order's "delivery time" so it shows on the order.
  // NOTE: picking a customer resets delivery_time in the checkout atom, so this must
  // also re-run on customer change — otherwise Place order stays disabled.
  useEffect(() => {
    const areaLabel = area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka';
    setDeliveryT({
      title: `${deliveryBy} — ${areaLabel}`,
      description: `Delivery charge ৳${Math.round(deliveryCharge)}`,
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryBy, area, deliveryCharge, (customer as any)?.value]);

  // ---- customer search (debounced) ----
  const custTimer = useRef<any>(null);
  function onCustInput(v: string) {
    setCustQ(v);
    setCustOpen(true);
    clearTimeout(custTimer.current);
    const q = v.trim();
    if (!q) {
      setCustRes([]);
      return;
    }
    setCustBusy(true);
    custTimer.current = setTimeout(async () => {
      try {
        const data: any = await userClient.fetchUsers({ name: q, page: 1 });
        setCustRes((data?.data ?? []).slice(0, 6));
      } catch {
        setCustRes([]);
      } finally {
        setCustBusy(false);
      }
    }, 300);
  }

  async function pickCustomer(u: any) {
    setCustOpen(false);
    let full = u;
    try {
      full = await userClient.fetchUser({ id: u.id });
    } catch {
      /* fall back to the list row */
    }
    setFullCust(full);
    setCustomer({ value: full.id, label: full.name, ...full });
    // customerAtom's setter NULLS customer_contact / shipping_address /
    // delivery_time when a customer is picked, so re-set them here. delivery_time
    // was only being re-set by a post-render effect, which left Place order
    // disabled right after picking a customer — set it explicitly instead.
    setContact(full?.profile?.contact ?? full?.mobile_number ?? '');
    const addrs = full?.address ?? [];
    const ship =
      addrs.find((a: any) => a?.type === 'shipping') ?? addrs[0] ?? null;
    if (ship) setShipping(ship);
    setDeliveryT({
      title: `${deliveryBy} — ${area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}`,
      description: `Delivery charge ৳${Math.round(deliveryCharge)}`,
    } as any);
    setCustQ(`${full.name}${full?.profile?.contact ? ' · ' + full.profile.contact : ''}`);
  }

  async function createCustomer() {
    const name = newName.trim();
    const c = newPhone.trim();
    setAddErr('');
    if (!name) { setAddErr('নাম দিন'); return; }
    if (!/^01[3-9]\d{8}$/.test(c)) { setAddErr('১১ ডিজিটের সঠিক মোবাইল নম্বর দিন'); return; }
    setAdding(true);
    try {
      const u: any = await HttpClient.post('admin-create-customer', { name, contact: c });
      await pickCustomer(u);
      setAddOpen(false);
      setNewName('');
      setNewPhone('');
    } catch (e: any) {
      setAddErr(e?.response?.data?.message || 'কাস্টমার তৈরি করা যায়নি');
    } finally {
      setAdding(false);
    }
  }

  // ---- book add ----
  function addBook(p: any) {
    if (!p?.quantity) return; // out of stock
    addItemToCart(generateCartItem(p, {} as any), 1);
    // Keep the dropdown open and the query intact so several books can be added in a row
    // straight from the scroll — no re-search per book.
    toast.success(`${p.name} যোগ হয়েছে`);
  }
  function inc(item: any) {
    if (item.quantity < (item.stock ?? Infinity))
      addItemToCart(item, 1);
  }
  function dec(item: any) {
    removeItemFromCart(item.id);
  }

  // ---- auto verify (shipping charge + tax) when items / address change ----
  const cartSig = useMemo(
    () =>
      (items ?? [])
        .map((i: any) => `${i.id}:${i.quantity}`)
        .join('|') + '#' + (shipping?.id ?? ''),
    [items, shipping?.id]
  );
  const verifyTimer = useRef<any>(null);
  useEffect(() => {
    clearTimeout(verifyTimer.current);
    if (!items?.length || !shipping) {
      setVbase(null);
      return;
    }
    verifyTimer.current = setTimeout(() => {
      verifyCheckout(
        {
          amount: calculateTotal(items),
          customer_id: (customer as any)?.value,
          products: items.map((i: any) => formatOrderedProduct(i)),
          billing_address: {
            ...(shipping?.address && omit(shipping.address, ['__typename'])),
          } as any,
          shipping_address: {
            ...(shipping?.address && omit(shipping.address, ['__typename'])),
          } as any,
        },
        {
          onSuccess: (data: any) => {
            if (!(data?.errors as string)) setVbase(data);
          },
        }
      );
    }, 350);
    return () => clearTimeout(verifyTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSig]);

  // The admin sets the delivery charge; keep tax/unavailable/wallet from verify but
  // force shipping_charge to the admin value so it drives the order total & payload.
  // (The cart context clears verified_response on any cart change, so re-apply here.)
  useEffect(() => {
    if (!items?.length) {
      setVerified(null);
      return;
    }
    setVerified({
      total_tax: Number(vbase?.total_tax ?? 0),
      shipping_charge: Number(deliveryCharge || 0),
      unavailable_products: vbase?.unavailable_products ?? [],
      wallet_amount: vbase?.wallet_amount ?? 0,
      wallet_currency: vbase?.wallet_currency ?? 0,
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vbase, deliveryCharge, cartSig]);

  function applyCoupon() {
    const code = couponIn.trim();
    if (!code) return;
    setCouponErr('');
    verifyCoupon(
      { code, sub_total: sub },
      {
        onSuccess: (data: any) => {
          if (data?.is_valid) {
            setCoupon(data.coupon);
            setCouponOpen(false);
          } else {
            setCouponErr(data?.message || 'Invalid coupon');
          }
        },
        onError: () => setCouponErr('Invalid coupon'),
      }
    );
  }

  // ---- money ----
  const sub = calculateTotal(items ?? []);
  const ship = Number(deliveryCharge || 0);
  const tax = Number(verified?.total_tax ?? 0);
  const couponAmt = Number((coupon as any)?.amount ?? 0);
  const discTotal = couponAmt + Number(manualDiscount || 0);
  const extra = Number(adjustment || 0);
  let total = Math.max(0, sub + ship + tax + extra - discTotal);
  const walletPoints = Number(
    (fullCust as any)?.wallet?.available_points ??
      (customer as any)?.wallet?.available_points ??
      0
  );
  let walletUsed = 0;
  if (useWallet && walletPoints > 0) {
    walletUsed = Math.min(walletPoints, total);
  }
  const afterWallet = Math.max(0, total - walletUsed);
  const adv = Number(advancePaid || 0);
  const due = adv > 0 ? Math.max(0, afterWallet - adv) : afterWallet;

  const ready = Boolean(customer && items?.length && shipping);

  // close dropdowns on outside click
  useEffect(() => {
    function onDoc(e: any) {
      if (!e.target.closest?.('.search')) {
        setCustOpen(false);
        setBookOpen(false);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="pos">
        {/* header row */}
        <div className="pos-top">
          <div className="title">New order</div>
          {drafts.length > 0 && (
            <div className="drafts">
              <span className="drafts-lbl">খসড়া:</span>
              {drafts.map((d) => (
                <button
                  key={d.id}
                  className="draft-chip"
                  onClick={() => loadDraft(d.id)}
                  title={d.label || `Draft #${d.id}`}
                >
                  #{d.id}
                </button>
              ))}
            </div>
          )}
          <div className="spacer" />
          <button
            className="draft-save"
            onClick={saveDraft}
            disabled={savingDraft || !items?.length}
            title="এই অর্ডার খসড়া হিসেবে সেভ করুন (place না করে)"
          >
            {savingDraft ? '…' : '💾 খসড়া সেভ'}
          </button>
          <div className="place-cta place-cta--top">
            <PlaceOrderAction>Place order</PlaceOrderAction>
          </div>
        </div>

        <div className="grid">
          {/* LEFT */}
          <div className="col">
            {/* customer */}
            <section className="card">
              <div className="card-hd">
                <span className="ico">●</span>
                <h2>Customer</h2>
              </div>
              <div className="search">
                <span className="pfx">⌕</span>
                <input
                  value={custQ}
                  placeholder="Name or phone — e.g. Sherlock or 01674…"
                  autoComplete="off"
                  onChange={(e) => onCustInput(e.target.value)}
                  onFocus={() => custQ && setCustOpen(true)}
                />
                {custOpen && (custRes.length > 0 || custBusy) && (
                  <div className="results">
                    {custBusy && custRes.length === 0 && (
                      <div className="res">
                        <span className="sb">Searching…</span>
                      </div>
                    )}
                    {custRes.map((c) => (
                      <div
                        className="res"
                        key={c.id}
                        onClick={() => pickCustomer(c)}
                      >
                        <div>
                          <div className="nm">{c.name}</div>
                          <div className="sb">
                            {c?.profile?.contact ?? c?.email ?? '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {!customer && (
                <div style={{ marginTop: 10 }}>
                  {!addOpen ? (
                    <button
                      type="button"
                      onClick={() => { setAddErr(''); setAddOpen(true); setNewName(custQ.split('·')[0].trim()); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                    >
                      ➕ নতুন কাস্টমার যোগ করুন
                    </button>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fafafa' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>নতুন কাস্টমার</div>
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="কাস্টমারের নাম" />
                      <input value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))} inputMode="numeric" placeholder="মোবাইল 01XXXXXXXXX" />
                      {addErr && <div style={{ fontSize: 12, color: '#e63946' }}>{addErr}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={adding} onClick={createCustomer} style={{ background: '#e63946', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', opacity: adding ? 0.6 : 1 }}>
                          {adding ? 'তৈরি হচ্ছে…' : 'যোগ করে সিলেক্ট করুন'}
                        </button>
                        <button type="button" onClick={() => setAddOpen(false)} style={{ background: '#efefef', color: '#333', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                          বাতিল
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {customer ? (
                <>
                  <div className="tags">
                    <span className="tag ok">{(customer as any).label}</span>
                    {walletPoints > 0 && (
                      <span className="tag gold">Wallet {tk(walletPoints)}</span>
                    )}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label className="lbl">Contact number</label>
                    <input
                      value={contact ?? ''}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                    {!contact && (
                      <p className="hint">
                        Required — this customer has no saved number.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="hint">Search to attach a customer.</p>
              )}
            </section>

            {/* items */}
            <section className="card">
              <div className="card-hd">
                <span className="ico">▤</span>
                <h2>Items</h2>
                {items?.length ? (
                  <button
                    type="button"
                    className="refresh-btn"
                    onClick={refreshItems}
                    disabled={refreshing}
                    title="Refresh prices & stock from the products"
                  >
                    <span className={refreshing ? 'spin' : ''}>↻</span>{' '}
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                ) : null}
                <span className="hd-note">Search to add</span>
              </div>
              <div className="search">
                <span className="pfx">▥</span>
                <input
                  value={bookQ}
                  placeholder="Book name or ISBN"
                  autoComplete="off"
                  onChange={(e) => {
                    setBookQ(e.target.value);
                    setBookOpen(true);
                    setBookLimit(20);
                  }}
                  onFocus={() => bookQ && setBookOpen(true)}
                />
                {bookOpen && bookQ.trim() && (
                  <div
                    className="results"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      if (
                        bookHasMore &&
                        el.scrollTop + el.clientHeight >= el.scrollHeight - 48
                      ) {
                        setBookLimit((l) => l + 20);
                      }
                    }}
                  >
                    {(bookHits ?? []).length === 0 && (
                      <div className="res">
                        <span className="sb">No book found</span>
                      </div>
                    )}
                    {(bookHits ?? []).map((b: any) => {
                      const inCartQty =
                        (items ?? []).find((i: any) => i.id === b.id)?.quantity || 0;
                      return (
                        <div
                          className="res"
                          key={b.id}
                          style={
                            b.quantity
                              ? inCartQty
                                ? { background: '#f0f9f4' }
                                : {}
                              : { opacity: 0.5, cursor: 'not-allowed' }
                          }
                          onClick={() => b.quantity && addBook(b)}
                        >
                          <div className="rcover">
                            {b.image?.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={b.image.thumbnail} alt={b.name} />
                            ) : null}
                          </div>
                          <div className="rinfo">
                            <div className="nm">{b.name}</div>
                            <div className="sb">
                              {b.quantity
                                ? 'Stock: ' + b.quantity
                                : 'Out of stock'}
                            </div>
                          </div>
                          {inCartQty > 0 && (
                            <span className="incart">✓ কার্টে {inCartQty}</span>
                          )}
                          <span className="rt">{tk(b.sale_price ?? b.price)}</span>
                        </div>
                      );
                    })}
                    {bookHasMore && (
                      <div
                        className="res"
                        style={{ justifyContent: 'center', cursor: 'default' }}
                        onClick={() => setBookLimit((l) => l + 20)}
                      >
                        <span className="sb">
                          আরও দেখতে স্ক্রল করুন ({bookHits?.length ?? 0}/
                          {Number((bookPag as any)?.total) || 0})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="cart">
                {!items?.length ? (
                  <div className="empty">No items yet — search above</div>
                ) : (
                  items.map((i: any) => (
                    <div className="item" key={i.id}>
                      <div className="cover">
                        {i.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.image} alt={i.name} />
                        ) : null}
                      </div>
                      <div className="info">
                        <div className="nm">{i.name}</div>
                        <div className="sb">
                          {tk(i.price)} each · stock {i.stock}
                        </div>
                      </div>
                      <div className="stepper">
                        <button onClick={() => dec(i)} aria-label="Decrease">
                          −
                        </button>
                        <span className="q">{i.quantity}</span>
                        <button onClick={() => inc(i)} aria-label="Increase">
                          +
                        </button>
                      </div>
                      <span className="line-total">
                        {tk(i.price * i.quantity)}
                      </span>
                      <a
                        className="edit-item"
                        href={`/products/${i.slug}/edit`}
                        target="_blank"
                        rel="noreferrer"
                        title="Edit this product (opens in a new tab)"
                        aria-label="Edit product"
                      >
                        ✎
                      </a>
                      <button
                        className="del"
                        onClick={() => clearItemFromCart(i.id)}
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* delivery */}
            <section className="card">
              <div className="card-hd">
                <span className="ico">⇥</span>
                <h2>Delivery</h2>
                <button
                  className="link"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setEditAddr((v) => !v)}
                >
                  {editAddr ? 'Done' : shipping ? 'Edit address' : 'Add address'}
                </button>
              </div>

              {!editAddr ? (
                <div className="addr">
                  {shipping && addrLine(shipping) ? (
                    <>
                      <b>{(shipping as any).title ?? 'Delivery address'}</b> ·{' '}
                      {addrLine(shipping)}
                    </>
                  ) : (
                    <>
                      <b>No address</b> · use “Add address” to enter one
                    </>
                  )}
                </div>
              ) : (
                <div className="adj" style={{ marginTop: 0, marginBottom: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="lbl">Street address</label>
                    <input
                      value={(shipping as any)?.address?.street_address ?? ''}
                      onChange={(e) =>
                        setAddrField('street_address', e.target.value)
                      }
                      placeholder="House / road / area"
                    />
                  </div>
                  <div>
                    <label className="lbl">City</label>
                    <input
                      value={(shipping as any)?.address?.city ?? ''}
                      onChange={(e) => setAddrField('city', e.target.value)}
                      placeholder="Dhaka"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="lbl">Delivery area (courier area)</label>
                    <AreaPicker
                      value={(shipping as any)?.address?.state ?? ''}
                      onChange={(v) => setAddrField('state', v)}
                    />
                  </div>
                  <div>
                    <label className="lbl">Zip</label>
                    <input
                      value={(shipping as any)?.address?.zip ?? ''}
                      onChange={(e) => setAddrField('zip', e.target.value)}
                      placeholder="1209"
                    />
                  </div>
                </div>
              )}

              {/* Delivery By */}
              <label className="lbl" style={{ marginTop: 4 }}>
                Delivery by
              </label>
              <div className="opts" style={{ marginBottom: 10 }}>
                {(['RedX', 'Sundharban', 'Pickup by customer'] as const).map(
                  (c) => (
                    <button
                      key={c}
                      className={cn('opt', { on: deliveryBy === c })}
                      onClick={() => chooseCourier(c)}
                    >
                      <div className="t">{c}</div>
                    </button>
                  )
                )}
              </div>

              {/* Delivery area */}
              <label className="lbl">Delivery area</label>
              <div className="opts" style={{ marginBottom: 10 }}>
                {(
                  [
                    ['inside', 'Inside Dhaka'],
                    ['outside', 'Outside Dhaka'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    className={cn('opt', { on: area === val })}
                    onClick={() => chooseArea(val)}
                    disabled={deliveryBy === 'Pickup by customer'}
                    style={
                      deliveryBy === 'Pickup by customer'
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : {}
                    }
                  >
                    <div className="t">{label}</div>
                  </button>
                ))}
              </div>

              {/* Delivery charge (editable) */}
              <label className="lbl">Delivery charge (৳)</label>
              <input
                type="number"
                min={0}
                value={deliveryCharge}
                onChange={(e) =>
                  setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))
                }
              />
              <p className="hint">
                Auto-set from area (Inside ৳60 · Outside ৳120) — edit if needed.
              </p>
            </section>

            {/* adjustments */}
            <details className="more">
              <summary>Adjustments &amp; note</summary>
              <div className="adj">
                <div>
                  <label className="lbl">Discount (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={manualDiscount || 0}
                    onChange={(e) => setManualDiscount(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="lbl">Extra charge (৳)</label>
                  <input
                    type="number"
                    value={adjustment || 0}
                    onChange={(e) => setAdjustment(Number(e.target.value) || 0)}
                  />
                  <p className="hint">Negative to subtract.</p>
                </div>
                <div>
                  <label className="lbl">Advance paid (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={advancePaid || 0}
                    onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)}
                  />
                  <p className="hint">Rest becomes due.</p>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="lbl">Order note</label>
                <textarea
                  rows={2}
                  value={note}
                  placeholder="Visible on the order page"
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </details>
          </div>

          {/* RIGHT */}
          <div className="col">
            <div className="side">
              <section className="card">
                <div className="card-hd">
                  <span className="ico">▧</span>
                  <h2>Summary</h2>
                  {verifying && <span className="hd-note">calculating…</span>}
                </div>

                <div className="row">
                  <span className="k">Sub total</span>
                  <span className="v">{tk(sub)}</span>
                </div>
                <div className="row">
                  <span className="k">Shipping</span>
                  <span className="v">{tk(ship)}</span>
                </div>
                <div className="row">
                  <span className="k">Tax</span>
                  <span className="v">{tk(tax)}</span>
                </div>
                {discTotal > 0 && (
                  <div className="row neg">
                    <span className="k">Discount</span>
                    <span className="v">−{tk(discTotal)}</span>
                  </div>
                )}
                {extra !== 0 && (
                  <div className="row">
                    <span className="k">Extra</span>
                    <span className="v">
                      {extra < 0 ? '−' : ''}
                      {tk(Math.abs(extra))}
                    </span>
                  </div>
                )}
                {walletUsed > 0 && (
                  <div className="row neg">
                    <span className="k">Wallet</span>
                    <span className="v">−{tk(walletUsed)}</span>
                  </div>
                )}

                {coupon ? (
                  <div className="row neg">
                    <span className="k">
                      Coupon ({(coupon as any).code})
                      <button className="link" onClick={() => setCoupon(null)}>
                        remove
                      </button>
                    </span>
                    <span className="v">−{tk(couponAmt)}</span>
                  </div>
                ) : (
                  <div className="row">
                    <button
                      className="link"
                      onClick={() => setCouponOpen((o) => !o)}
                    >
                      + Apply coupon
                    </button>
                  </div>
                )}
                {couponOpen && !coupon && (
                  <div className="coupon-row">
                    <input
                      value={couponIn}
                      placeholder="BOOK50"
                      onChange={(e) => setCouponIn(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    />
                    <button
                      className="btn"
                      onClick={applyCoupon}
                      disabled={couponBusy}
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponErr && <p className="err">{couponErr}</p>}

                <div className="total">
                  <span className="k">Total</span>
                  <span className="v">{tk(afterWallet)}</span>
                </div>
                {adv > 0 && (
                  <>
                    <div className="row neg">
                      <span className="k">Advance paid</span>
                      <span className="v">−{tk(adv)}</span>
                    </div>
                    <div className="row" style={{ fontWeight: 600 }}>
                      <span className="k" style={{ color: 'var(--ink)' }}>
                        Due ({deliveryBy === 'Pickup by customer' ? 'on pickup' : 'COD'})
                      </span>
                      <span className="v">{tk(due)}</span>
                    </div>
                  </>
                )}

                {walletPoints > 0 && (
                  <label className="togg">
                    <input
                      type="checkbox"
                      checked={!!useWallet}
                      onChange={() => toggleWallet()}
                    />
                    <span>
                      Use wallet{' '}
                      <span style={{ color: 'var(--ink-2)' }}>
                        ({tk(walletPoints)})
                      </span>
                    </span>
                  </label>
                )}

                <h2 className="pay-h">Payment</h2>
                <div className="pays">
                  {PAYMENTS.map((p) => (
                    <button
                      key={p.value}
                      className={cn('opt', { on: pay === p.value })}
                      style={{ textAlign: 'center' }}
                      onClick={() => setPay(p.value)}
                    >
                      <div className="t">{p.label}</div>
                    </button>
                  ))}
                </div>

                <div className={cn('status', ready ? 'ok' : 'no')}>
                  {ready
                    ? '✓ Ready to place order'
                    : !customer
                    ? 'Attach a customer to continue'
                    : !items?.length
                    ? 'Add at least one item'
                    : 'Customer has no saved address'}
                </div>

                <div className="place-cta place-cta--side">
                  <PlaceOrderAction>Place order</PlaceOrderAction>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* mobile bar */}
        <div className="mobile-bar">
          <div className="mt">
            <div className="k">Total</div>
            <div className="v">{tk(afterWallet)}</div>
          </div>
          <div className="place-cta place-cta--mobile">
            <PlaceOrderAction>Place order</PlaceOrderAction>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pos {
          --red: #3d9070;
          --red-dark: #337c5f;
          --red-tint: #e8f4ef;
          --ink: #333132;
          --ink-2: #6b6869;
          --ink-3: #9a9799;
          --line: #e5e1dc;
          --line-2: #d2ccc5;
          --paper: #f7f5f1;
          --card: #ffffff;
          --ok: #1d7a5f;
          --ok-tint: #e6f4ef;
          --warn-tint: #fdf3e3;
          --warn: #8a5a0b;
          --r: 8px;
          font-family: 'Hind Siliguri', system-ui, sans-serif;
          color: var(--ink);
          font-size: 14px;
          line-height: 1.5;
        }
        .pos :global(input),
        .pos :global(textarea) {
          width: 100%;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--r);
          padding: 8px 10px;
          outline: none;
          color: var(--ink);
          font-family: inherit;
          font-size: 14px;
        }
        .pos :global(input:focus),
        .pos :global(textarea:focus) {
          border-color: var(--red);
          box-shadow: 0 0 0 3px var(--red-tint);
        }
        .pos-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .pos-top .title {
          font-weight: 600;
          font-size: 18px;
        }
        .chip {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid var(--line-2);
          color: var(--ink-2);
        }
        .spacer {
          flex: 1;
        }
        .drafts {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .drafts-lbl {
          font-size: 11px;
          color: var(--ink-2);
          font-weight: 600;
        }
        .draft-chip {
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
          background: #eef4ff;
          border: 1px solid #c7dbff;
          color: #2453b8;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .draft-chip:hover {
          background: #dbe8ff;
        }
        .draft-save {
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 10px;
          background: #fff;
          border: 1.5px solid var(--line-2);
          color: var(--ink);
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: border-color 0.15s;
        }
        .draft-save:hover:not(:disabled) {
          border-color: #2e6b5a;
          color: #2e6b5a;
        }
        .draft-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }
        .col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 1px 2px rgba(51, 49, 50, 0.05);
        }
        .card-hd {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .card-hd h2 {
          font-size: 13px;
          font-weight: 600;
        }
        .hd-note {
          margin-left: auto;
          font-size: 12px;
          color: var(--ink-3);
        }
        .ico {
          font-size: 15px;
          color: var(--red);
          line-height: 1;
        }
        .lbl {
          font-size: 11px;
          font-weight: 500;
          color: var(--ink-2);
          display: block;
          margin-bottom: 4px;
        }
        .hint {
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 4px;
        }
        .err {
          font-size: 11px;
          color: var(--red-dark);
          margin-top: 6px;
        }
        .search {
          position: relative;
        }
        .search .pfx {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--ink-3);
          font-size: 14px;
          z-index: 1;
        }
        .search :global(input) {
          padding-left: 32px;
        }
        .results {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 30;
          background: #fff;
          border: 1px solid var(--line-2);
          border-radius: var(--r);
          box-shadow: 0 8px 24px rgba(51, 49, 50, 0.12);
          max-height: 240px;
          overflow-y: auto;
        }
        .res {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          cursor: pointer;
          border-bottom: 1px solid var(--line);
        }
        .res:last-child {
          border-bottom: none;
        }
        .res:hover {
          background: var(--red-tint);
        }
        .res .nm {
          font-size: 13px;
          font-weight: 500;
        }
        .res .sb {
          font-size: 11px;
          color: var(--ink-2);
        }
        .res .rt {
          margin-left: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .res .incart {
          margin-left: auto;
          font-size: 10.5px;
          font-weight: 700;
          color: #0f9d68;
          background: #e4f6ee;
          border-radius: 999px;
          padding: 2px 8px;
          white-space: nowrap;
        }
        /* When no in-cart badge sits before it, the price pushes itself right. */
        .res .rt:first-of-type {
          margin-left: auto;
        }
        .res .rcover {
          width: 28px;
          height: 38px;
          border-radius: 3px;
          background: linear-gradient(160deg, #ede7e0, #dcd4cb);
          flex-shrink: 0;
          overflow: hidden;
        }
        .res .rcover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .res .rinfo {
          min-width: 0;
        }
        .tags {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .tag {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--paper);
          color: var(--ink-2);
          border: 1px solid var(--line);
        }
        .tag.gold {
          background: var(--warn-tint);
          color: var(--warn);
          border-color: #ebd9b4;
        }
        .tag.ok {
          background: var(--ok-tint);
          color: var(--ok);
          border-color: #bfe3d6;
        }
        .cart {
          margin-top: 4px;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: var(--paper);
          border-radius: var(--r);
          margin-top: 6px;
        }
        .cover {
          width: 32px;
          height: 44px;
          border-radius: 3px;
          background: linear-gradient(160deg, #ede7e0, #dcd4cb);
          flex-shrink: 0;
          overflow: hidden;
        }
        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .item .info {
          min-width: 0;
          flex: 1;
        }
        .item .nm {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item .sb {
          font-size: 11px;
          color: var(--ink-2);
        }
        .stepper {
          display: flex;
          align-items: center;
          border: 1px solid var(--line-2);
          border-radius: var(--r);
          background: #fff;
          overflow: hidden;
        }
        .stepper button {
          border: none;
          background: none;
          padding: 4px 9px;
          cursor: pointer;
          color: var(--ink-2);
          font-size: 14px;
          line-height: 1;
        }
        .stepper button:hover {
          background: var(--paper);
          color: var(--red);
        }
        .stepper .q {
          width: 34px;
          text-align: center;
          font-size: 13px;
          font-weight: 500;
        }
        .line-total {
          font-size: 13px;
          font-weight: 600;
          min-width: 52px;
          text-align: right;
        }
        .del {
          border: none;
          background: none;
          color: var(--ink-3);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .del:hover {
          color: var(--red);
          background: var(--red-tint);
        }
        .edit-item {
          border: none;
          background: none;
          color: var(--ink-3);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          text-decoration: none;
          line-height: 1;
        }
        .edit-item:hover {
          color: var(--red);
          background: var(--paper);
        }
        .refresh-btn {
          margin-left: 10px;
          border: 1px solid var(--line);
          background: var(--card);
          color: var(--red);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .refresh-btn:hover:not(:disabled) {
          background: var(--paper);
        }
        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .refresh-btn .spin {
          display: inline-block;
          animation: ib-spin 0.8s linear infinite;
        }
        @keyframes ib-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .empty {
          text-align: center;
          padding: 18px;
          color: var(--ink-3);
          font-size: 12px;
          background: var(--paper);
          border-radius: var(--r);
          margin-top: 6px;
        }
        .opts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 6px;
        }
        .opt {
          border: 1px solid var(--line);
          border-radius: var(--r);
          padding: 7px 9px;
          cursor: pointer;
          background: #fff;
          text-align: left;
        }
        .opt:hover {
          border-color: var(--line-2);
          background: #faf8f5;
        }
        .opt.on {
          border-color: var(--red);
          background: var(--red-tint);
          box-shadow: inset 0 0 0 1px var(--red);
        }
        .opt .t {
          font-size: 12px;
          font-weight: 600;
        }
        .opt .s {
          font-size: 11px;
          color: var(--ink-2);
        }
        .addr {
          font-size: 12px;
          color: var(--ink-2);
          line-height: 1.5;
          background: var(--paper);
          padding: 8px 10px;
          border-radius: var(--r);
          margin-bottom: 8px;
        }
        .addr b {
          color: var(--ink);
          font-weight: 600;
        }
        .more {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 1px 2px rgba(51, 49, 50, 0.05);
        }
        .more summary {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          cursor: pointer;
          list-style: none;
        }
        .more summary::-webkit-details-marker {
          display: none;
        }
        .adj {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }
        .side {
          position: sticky;
          top: 20px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 3px 0;
        }
        .row .k {
          color: var(--ink-2);
        }
        .row.neg .v {
          color: var(--ok);
        }
        .link {
          background: none;
          border: none;
          color: var(--red);
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          margin-left: 6px;
        }
        .link:hover {
          text-decoration: underline;
        }
        .coupon-row {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .coupon-row :global(input) {
          font-size: 12px;
          padding: 6px 8px;
        }
        .btn {
          border: 1px solid var(--line-2);
          background: #fff;
          color: var(--ink);
          border-radius: var(--r);
          padding: 7px 12px;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn:hover {
          border-color: var(--ink-3);
          background: #faf8f5;
        }
        .total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-top: 1px solid var(--line);
          margin-top: 10px;
          padding-top: 10px;
        }
        .total .k {
          font-size: 14px;
          font-weight: 600;
        }
        .total .v {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .togg {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          background: var(--paper);
          padding: 8px 10px;
          border-radius: var(--r);
          cursor: pointer;
          margin-top: 10px;
        }
        .togg :global(input) {
          width: auto;
          margin: 0;
          accent-color: var(--red);
        }
        .pay-h {
          font-size: 13px;
          font-weight: 600;
          margin: 14px 0 7px;
        }
        .pays {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .status {
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: var(--r);
          font-size: 11px;
          font-weight: 500;
        }
        .status.ok {
          background: var(--ok-tint);
          color: var(--ok);
        }
        .status.no {
          background: var(--red-tint);
          color: var(--red-dark);
        }
        .place-cta {
          margin-top: 12px;
        }
        .place-cta :global(button) {
          background: var(--red) !important;
          border-color: var(--red) !important;
          color: #fff !important;
          border-radius: var(--r) !important;
          font-weight: 600 !important;
        }
        .place-cta :global(button:hover) {
          background: var(--red-dark) !important;
          border-color: var(--red-dark) !important;
        }
        .place-cta :global(button:disabled) {
          background: var(--ink-3) !important;
          border-color: var(--ink-3) !important;
        }
        .place-cta--top {
          margin-top: 0;
          width: 190px;
        }
        .place-cta--top :global(button) {
          margin-top: 0 !important;
        }
        .mobile-bar {
          display: none;
        }
        @media (max-width: 880px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .side {
            position: static;
          }
          .place-cta--top {
            display: none;
          }
          .place-cta--side {
            display: none;
          }
          .mobile-bar {
            display: flex;
            position: sticky;
            bottom: 0;
            z-index: 20;
            background: #fff;
            border-top: 1px solid var(--line);
            padding: 10px 14px;
            gap: 12px;
            align-items: center;
            margin: 12px -16px -16px;
          }
          .mobile-bar .mt {
            flex: 1;
          }
          .mobile-bar .mt .k {
            font-size: 11px;
            color: var(--ink-2);
          }
          .mobile-bar .mt .v {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 700;
          }
          .place-cta--mobile {
            margin-top: 0;
            width: 150px;
          }
          .place-cta--mobile :global(button) {
            margin-top: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

CreateOrderPage.authenticate = {
  permissions: adminOnly,
};
CreateOrderPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
