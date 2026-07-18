import AdminLayout from '@/components/layouts/admin';
import SettingsPageHeader from '@/components/settings/settings-page-header';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import {
  useInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
} from '@/data/integrations';

const card = 'mb-4 rounded-2xl border border-[#e6e6e8] bg-white p-6';

export default function InvoiceSettingsPage() {
  const { showReplacementNote, loading } = useInvoiceSettingsQuery();
  const { mutate: save, isLoading: saving } = useUpdateInvoiceSettingsMutation();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (showReplacementNote !== undefined && showReplacementNote !== null) {
      setShow(Boolean(showReplacementNote));
    }
  }, [showReplacementNote]);

  return (
    <>
      <SettingsPageHeader pageTitle="Invoice" />

      <div className={card}>
        <h3 className="mb-1 text-base font-semibold text-heading">
          Free replacement promise
        </h3>
        <p className="mb-5 text-sm text-body">
          Controls the guarantee line printed on the order invoice. Turning it off is a change
          to what you promise customers, so it takes effect on every invoice printed after you
          save.
        </p>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={show}
            disabled={loading || saving}
            onChange={(e) => setShow(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#e63946]"
          />
          <span className="text-sm text-heading">
            Print &ldquo;Damaged or wrong book? Free replacement within 3 days — no questions
            asked.&rdquo;
          </span>
        </label>

        <div className="mt-5 rounded-lg border border-dashed border-[#d8d8dc] bg-[#fafafb] p-4">
          <p className="mb-1.5 text-xs font-semibold text-[#5f5f66]">
            Invoice will read:
          </p>
          <p className="text-sm text-heading">
            <b>Genuine Book Guarantee.</b> 100% original edition.
            {show
              ? ' Damaged or wrong book? Free replacement within 3 days — no questions asked.'
              : ''}
          </p>
        </div>

        <button
          onClick={() => save({ show_replacement_note: show })}
          disabled={loading || saving}
          className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}

InvoiceSettingsPage.authenticate = { permissions: adminOnly };
InvoiceSettingsPage.Layout = AdminLayout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});
