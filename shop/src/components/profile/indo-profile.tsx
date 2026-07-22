import { useRef } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import pick from 'lodash/pick';
import { Form } from '@/components/ui/forms/form';
import Button from '@/components/ui/button';
import Input from '@/components/ui/forms/input';
import TextArea from '@/components/ui/forms/text-area';
import FileInput from '@/components/ui/forms/file-input';
import PhoneInput from '@/components/ui/forms/phone-input';
import Link from '@/components/ui/link';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { AddressType } from '@/framework/utils/constants';
import {
  useUpdateUser,
  useUpdateEmail,
  useLogout,
} from '@/framework/user';
import { useSettings } from '@/framework/settings';
import { siteSettings } from '@/config/site';
import { Routes } from '@/config/routes';
import { isStripeAvailable } from '@/lib/is-stripe-available';
import { HttpClient } from '@/framework/client/http-client';
import { formatAddress } from '@/lib/format-address';
import type { UpdateUserInput, UpdateEmailUserInput, User } from '@/types';

/* Icons for the sidebar nav — keyed by route, matching the mockup */
const NAV_ICONS: Record<string, string> = {
  [Routes.profile]: '👤',
  [Routes.changePassword]: '🔑',
  [Routes.notifyLogs]: '🔔',
  [Routes.cards]: '💳',
  [Routes.orders]: '📦',
  '/requests': '📝',
  '/resell': '📖',
  '/reseller': '🏪',
  [Routes.messages]: '💬',
  [Routes.downloads]: '⬇️',
  [Routes.wishlists]: '❤️',
  [Routes.questions]: '❓',
  [Routes.refunds]: '💸',
  [Routes.reports]: '📄',
  [Routes.help]: '🆘',
};

/* ---------- Dashboard nav menu (matches the mockup sidebar) ---------- */
function ProfileNav() {
  const { t } = useTranslation();
  const { pathname } = useRouter();
  const { settings } = useSettings();
  const { mutate: logout } = useLogout();

  const items = (siteSettings.dashboardSidebarMenu ?? [])
    .slice(0, -1) // drop logout, rendered separately
    .filter((item: any) => {
      if (item?.href === Routes.cards && !isStripeAvailable(settings)) {
        return false;
      }
      if (
        item?.href === Routes.notifyLogs &&
        !Boolean(settings?.enableEmailForDigitalProduct)
      ) {
        return false;
      }
      return true;
    });

  const linkClass = (active: boolean) =>
    classNames(
      'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] font-medium transition-colors',
      active
        ? 'bg-accent/10 font-bold text-accent'
        : 'text-heading/80 hover:bg-gray-50 hover:text-heading',
    );

  return (
    <nav className="overflow-hidden rounded-2xl border border-border-100 bg-light p-2 shadow-sm">
      {items.map((item: any, idx: number) => {
        const active = pathname === item.href;
        return (
          <div key={idx}>
            {item.href === Routes.messages ? (
              <div className="mx-2.5 my-1.5 h-px bg-border-100" />
            ) : null}
            <Link href={item.href} className={linkClass(active)}>
              <span className="w-[18px] shrink-0 text-center text-base leading-none">
                {NAV_ICONS[item.href] ?? '•'}
              </span>
              {t(item.label)}
            </Link>
          </div>
        );
      })}
      <div className="mx-2.5 my-1.5 h-px bg-border-100" />
      <button
        type="button"
        onClick={() => logout()}
        className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-medium text-body transition-colors hover:bg-gray-50"
      >
        <span className="w-[18px] shrink-0 text-center text-base leading-none">
          ↩️
        </span>
        {t('profile-sidebar-logout')}
      </button>
    </nav>
  );
}

/* Bengali numeral helper — matches the mockup's numeric styling */
const bn = (v: number | string) =>
  String(v ?? '').replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

function initials(name?: string) {
  if (!name) return 'IB';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'IB';
}

/* ---------- New arrivals strip (client-side, real catalog) ---------- */
function ArrivalsShowcase() {
  const { data, isLoading } = useQuery(['profile-new-arrivals'], () =>
    // exclude_preorder: a pre-order carries a stock number but is not on the shelf yet, so it
    // does not belong under "নতুন বই এসেছে". The client-side guards below are a second net —
    // the endpoint is edge-cached, so a book can sell out between the cache fill and this render.
    HttpClient.get<any>('books-listing', {
      page: 1,
      limit: 12,
      exclude_preorder: 1,
    }),
  );
  const books: any[] = ((data as any)?.data ?? [])
    .filter((b: any) => Number(b?.quantity) > 0 && !b?.is_preorder)
    .slice(0, 10);

  return (
    <section className="mb-6 rounded-2xl border border-border-100 bg-light p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
            🔥 এইমাত্র এসেছে
          </span>
          <h2 className="text-lg font-bold text-heading">নতুন বই এসেছে</h2>
          <p className="mt-0.5 text-[13px] text-body">
            সদ্য সংগ্রহে যোগ হওয়া বইগুলো দেখে নিন
          </p>
        </div>
        <Link
          href="/books/search"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/10 px-4 py-2 text-[13px] font-bold text-accent transition hover:bg-accent/20"
        >
          সব দেখুন <span>→</span>
        </Link>
      </div>

      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {(isLoading ? Array.from({ length: 6 }) : books).map(
          (product: any, i: number) => {
            const cover =
              product?.image?.original || product?.image?.thumbnail || '';
            const price = product?.sale_price || product?.price;
            return (
              <Link
                key={product?.id ?? i}
                href={product?.slug ? `/products/${product.slug}` : '#'}
                className="w-32 shrink-0 snap-start transition hover:-translate-y-1"
              >
                <div className="relative flex aspect-[3/4] items-end overflow-hidden rounded-lg bg-gray-200 shadow-md ring-1 ring-black/5">
                  <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-light shadow">
                    নতুন
                  </span>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={product?.name ?? ''}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="pt-2.5">
                  <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-heading">
                    {product?.name ?? '—'}
                  </div>
                  {product?.author?.name ? (
                    <div className="mt-0.5 text-[11.5px] text-body">
                      {product.author.name}
                    </div>
                  ) : null}
                  {price ? (
                    <div className="mt-1 text-[15px] font-bold text-accent">
                      ৳{bn(price)}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          },
        )}
      </div>
    </section>
  );
}

/* ---------- Card shell matching the mockup ---------- */
function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-100 bg-light shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border-100 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-bold text-heading">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-body">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/* ---------- Main ---------- */
export default function IndoProfile({ user: me }: { user: User }) {
  const { mutate: updateProfile, isLoading: savingProfile } = useUpdateUser();
  const { mutate: updateEmail, isLoading: savingEmail } = useUpdateEmail();
  const { openModal } = useModalAction();
  const emailRef = useRef<HTMLDivElement>(null);

  const wallet = (me as any)?.wallet ?? {};
  const contact = me?.profile?.contact ?? '';
  const addresses: any[] = (me as any)?.address ?? [];

  function onSaveProfile(values: UpdateUserInput) {
    updateProfile({
      id: me.id,
      name: values.name,
      profile: {
        id: me?.profile?.id,
        bio: values?.profile?.bio ?? '',
        // @ts-ignore
        avatar: values?.profile?.avatar?.[0],
      },
    });
  }

  function onSaveEmail(values: UpdateEmailUserInput) {
    updateEmail({ email: values?.email });
  }

  function editContact() {
    openModal('ADD_OR_UPDATE_PROFILE_CONTACT', {
      customerId: me.id,
      profileId: me?.profile?.id,
      contact,
    });
  }
  function addAddress() {
    openModal('ADD_OR_UPDATE_ADDRESS', {
      customerId: me.id,
      type: AddressType.Billing,
    });
  }
  function editAddress(address: any) {
    openModal('ADD_OR_UPDATE_ADDRESS', { customerId: me.id, address });
  }
  function deleteAddress(address: any) {
    openModal('DELETE_ADDRESS', { customerId: me.id, addressId: address?.id });
  }

  return (
    <div className="w-full">
      {/* page head */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-heading">
            আমার প্রোফাইল
          </h1>
          <div className="mt-0.5 text-[13px] text-body">Account · Profile</div>
        </div>
        <div className="text-[13px] text-body">
          স্বাগতম, <b className="text-heading">{me?.name}</b>
        </div>
      </div>

      <ArrivalsShowcase />

      {/* offer banner */}
      <div
        className="relative mb-6 flex flex-wrap items-center gap-6 overflow-hidden rounded-2xl px-6 py-6 text-light shadow-lg sm:px-8"
        style={{
          background:
            'linear-gradient(120deg,#3A1116 0%,#CE2331 55%,#EF3543 100%)',
        }}
      >
        <div className="relative z-10 min-w-[240px] flex-1">
          <span className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-bold tracking-wide backdrop-blur">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
            নতুন বই আসছে
          </span>
          <h2 className="text-xl font-bold leading-snug">
            নতুন বইয়ের খবর সবার আগে পান
          </h2>
          <p className="mt-1 text-[14px] text-white/85">
            প্রতি সপ্তাহে নতুন সংগ্রহ, প্রি-অর্ডার আর সদস্যদের বিশেষ ছাড় —
            সরাসরি আপনার ইনবক্সে।
          </p>
        </div>
        <div className="relative z-10 flex min-w-[240px] flex-1 gap-2.5">
          <input
            type="email"
            readOnly
            value={me?.email ?? ''}
            className="flex-1 rounded-xl border-none bg-white/95 px-4 py-3 text-[14px] text-heading outline-none"
          />
          <button
            type="button"
            onClick={() =>
              emailRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            className="whitespace-nowrap rounded-xl bg-heading px-5 py-3 text-[14px] font-semibold text-light transition hover:bg-black"
          >
            আপডেট নিন
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* wallet + nav sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div
            className="overflow-hidden rounded-2xl border p-5 shadow-sm"
            style={{
              background: 'linear-gradient(160deg,#FFF6E6 0%,#FBE9C7 100%)',
              borderColor: '#F1DCA9',
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#8A6A1E]">
                ওয়ালেট পয়েন্ট
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD976] to-[#E9A227] text-[13px] text-light shadow">
                ◈
              </span>
            </div>
            <div className="flex">
              {[
                { v: wallet.total_points ?? 0, k: 'মোট', accent: false },
                { v: wallet.points_used ?? 0, k: 'ব্যবহৃত', accent: false },
                {
                  v: wallet.available_points ?? 0,
                  k: 'বাকি',
                  accent: true,
                },
              ].map((s, i) => (
                <div
                  key={s.k}
                  className={`flex-1 text-center ${
                    i > 0 ? 'border-l border-[#d8b96f]/40' : ''
                  }`}
                >
                  <div
                    className={`text-[22px] font-bold leading-none ${
                      s.accent ? 'text-accent' : 'text-[#7A5A16]'
                    }`}
                  >
                    {bn(s.v)}
                  </div>
                  <div className="mt-1 text-[11px] text-[#A5822F]">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          <ProfileNav />
        </aside>

        {/* main column */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Profile */}
          <SectionCard
            title="Profile"
            subtitle="আপনার নাম, ছবি ও পরিচিতি পাঠকদের কাছে দেখানো হবে"
          >
            <Form<UpdateUserInput>
              onSubmit={onSaveProfile}
              useFormProps={{
                defaultValues: pick(me, [
                  'name',
                  'profile.bio',
                  'profile.avatar',
                ]),
              }}
            >
              {({ register, control }) => (
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-[#C41E2B] text-[34px] font-extrabold text-light shadow-lg">
                      {me?.profile?.avatar?.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={me.profile.avatar.thumbnail}
                          alt={me?.name ?? ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(me?.name)
                      )}
                    </div>
                    <div className="mt-3 w-full max-w-[150px]">
                      <FileInput control={control} name="profile.avatar" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <Input
                      label="নাম"
                      {...register('name')}
                      variant="outline"
                    />
                    <TextArea
                      label="বায়ো (ঐচ্ছিক)"
                      // @ts-ignore
                      {...register('profile.bio')}
                      variant="outline"
                      placeholder="নিজের সম্পর্কে কয়েকটি লাইন — কোন ধরনের বই আপনার পছন্দ?"
                    />
                    <div className="flex justify-end">
                      <Button loading={savingProfile} disabled={savingProfile}>
                        পরিবর্তন সংরক্ষণ
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Form>
          </SectionCard>

          {/* Email */}
          <div ref={emailRef}>
            <SectionCard
              title="Email"
              subtitle="অর্ডার আপডেট ও রসিদ এই ঠিকানায় পাঠানো হবে"
            >
              <Form<UpdateEmailUserInput>
                onSubmit={onSaveEmail}
                useFormProps={{ defaultValues: pick(me, ['email']) }}
              >
                {({ register }) => (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                      <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-heading">
                        ইমেইল ঠিকানা
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-600">
                          ✔ যাচাইকৃত
                        </span>
                      </div>
                      <Input
                        {...register('email')}
                        variant="outline"
                        disabled={savingEmail}
                      />
                    </div>
                    <Button loading={savingEmail} disabled={savingEmail}>
                      আপডেট
                    </Button>
                  </div>
                )}
              </Form>
            </SectionCard>
          </div>

          {/* Contact */}
          <SectionCard
            title="Contact Number"
            subtitle="ডেলিভারির সময় কুরিয়ার এই নম্বরে যোগাযোগ করবে"
            action={
              <button
                type="button"
                onClick={editContact}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-accent/10"
              >
                {contact ? '✎ পরিবর্তন' : '+ যোগ করুন'}
              </button>
            }
          >
            <PhoneInput
              country="bd"
              value={contact}
              disabled
              inputClass="!p-0 ltr:!pr-4 ltr:!pl-14 !flex !items-center !w-full !appearance-none !text-heading !text-sm focus:!outline-none focus:!ring-0 !border !border-border-base !rounded-lg !h-12"
              dropdownClass="focus:!ring-0 !border !border-border-base"
            />
          </SectionCard>

          {/* Addresses */}
          <SectionCard
            title="Addresses"
            subtitle="ডেলিভারির জন্য সংরক্ষিত ঠিকানা"
            action={
              <button
                type="button"
                onClick={addAddress}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-accent/10"
              >
                + নতুন ঠিকানা
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="group relative rounded-xl border border-border-100 p-4 transition hover:border-accent/40 hover:shadow-sm"
                >
                  <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11.5px] font-bold text-accent">
                    📍 {address?.title || 'ঠিকানা'}
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-body">
                    {formatAddress(address?.address)}
                  </p>
                  <div className="mt-3 flex gap-4">
                    <button
                      type="button"
                      onClick={() => editAddress(address)}
                      className="text-[12.5px] font-semibold text-body transition hover:text-accent"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAddress(address)}
                      className="text-[12.5px] font-semibold text-body transition hover:text-accent"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addAddress}
                className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-200 p-4 text-body transition hover:border-accent hover:bg-accent/5 hover:text-accent"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl">
                  +
                </span>
                <span className="text-[13px]">নতুন ঠিকানা যোগ করুন</span>
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
