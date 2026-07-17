import AdminLayout from '@/components/layouts/admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { RELEASES, type ChangeType } from '@/data/changelog-data';

const C = {
  paper: '#f6f6f3', card: '#fff', ink: '#16221f', sub: '#6b7773', line: '#e7e8e3', brand: '#0f766e',
};

const TAG: Record<ChangeType, { label: string; fg: string; bg: string; dot: string }> = {
  added: { label: 'New', fg: '#0f7a4f', bg: '#e4f6ee', dot: '#12b76a' },
  improved: { label: 'Improved', fg: '#1d4ed8', bg: '#e7eefb', dot: '#3b82f6' },
  fixed: { label: 'Fixed', fg: '#b45309', bg: '#fdf2dd', dot: '#f59e0b' },
};

export default function UpdatesPage() {
  return (
    <div style={{ background: C.paper, minHeight: '100%', padding: '20px 4px 48px', fontFamily: "'Inter', system-ui, sans-serif", color: C.ink }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
          <div style={{ width: 5, height: 30, background: C.brand, borderRadius: 3 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Updates</h1>
            <div style={{ fontSize: 12.5, color: C.sub }}>What changed in each release — newest first</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
          {RELEASES.map((r) => (
            <div key={r.version} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: C.brand, borderRadius: 999, padding: '3px 10px' }}>v{r.version}</span>
                <h2 style={{ fontSize: 16.5, fontWeight: 800, margin: 0 }}>{r.title}</h2>
                <span style={{ marginLeft: 'auto', fontSize: 12.5, color: C.sub, fontWeight: 600 }}>{r.date}</span>
              </div>

              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 9 }}>
                {r.items.map((it, i) => {
                  const t = TAG[it.type];
                  return (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ flexShrink: 0, marginTop: 2, fontSize: 10.5, fontWeight: 800, color: t.fg, background: t.bg, borderRadius: 6, padding: '2px 8px', minWidth: 62, textAlign: 'center' }}>{t.label}</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink }}>{it.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 18, fontSize: 12, color: C.sub, textAlign: 'center' }}>
          প্রতিটি লাইভ আপডেটের পর এখানে নতুন সংস্করণ যোগ হবে।
        </p>
      </div>
    </div>
  );
}

UpdatesPage.authenticate = { permissions: adminOnly };
UpdatesPage.Layout = AdminLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});
