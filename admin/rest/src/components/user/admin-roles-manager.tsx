import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Loader from '@/components/ui/loader/loader';
import Description from '@/components/ui/description';
import { TrashIcon } from '@/components/icons/trash';
import {
  useAdminRolesQuery,
  useSaveAdminRolesMutation,
} from '@/data/user';
import { AdminRole } from '@/types';
import { isFullAdmin } from '@/utils/auth-utils';
import { useEffect, useState } from 'react';

function newRole(): AdminRole {
  return { id: '', name: '', sections: [] };
}

const AdminRolesManager = () => {
  const { sections, roles, loading } = useAdminRolesQuery();
  const { mutate: save, isLoading: saving } = useSaveAdminRolesMutation();
  const [draft, setDraft] = useState<AdminRole[]>([]);
  const fullAdmin = isFullAdmin();

  useEffect(() => {
    if (!loading) setDraft(roles?.length ? roles : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) return <Loader text="Loading…" />;

  if (!fullAdmin) {
    return (
      <Card>
        <p className="text-body">
          Only a full super-admin can manage roles.
        </p>
      </Card>
    );
  }

  const updateRole = (i: number, patch: Partial<AdminRole>) => {
    setDraft((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  };

  const toggleSection = (i: number, key: string) => {
    setDraft((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const has = r.sections.includes(key);
        return {
          ...r,
          sections: has
            ? r.sections.filter((s) => s !== key)
            : [...r.sections, key],
        };
      }),
    );
  };

  const removeRole = (i: number) => {
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSave = () => {
    const clean = draft
      .map((r) => ({ ...r, name: r.name.trim() }))
      .filter((r) => r.name !== '');
    save(clean);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Description
          title="Admin roles"
          details="Create named roles and tick which admin sections each may access. Assign a role to an admin when you create them, or from the admin list."
          className="w-full sm:w-8/12"
        />
        <Button
          variant="outline"
          onClick={() => setDraft((p) => [...p, newRole()])}
          type="button"
        >
          + Add role
        </Button>
      </div>

      {draft.length === 0 && (
        <Card className="mb-5">
          <p className="text-body">
            No roles yet. Click <strong>Add role</strong> to create one (e.g.
            &quot;Order desk&quot; with only Orders &amp; Customers).
          </p>
        </Card>
      )}

      <div className="space-y-5">
        {draft.map((role, i) => (
          <Card key={i}>
            <div className="mb-4 flex items-end gap-3">
              <Input
                label="Role name"
                value={role.name}
                onChange={(e) => updateRole(i, { name: e.target.value })}
                variant="outline"
                className="flex-1"
                placeholder="e.g. Order desk"
              />
              <button
                type="button"
                onClick={() => removeRole(i)}
                className="mb-1 flex items-center gap-1 rounded border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                title="Delete role"
              >
                <TrashIcon width={14} /> Delete
              </button>
            </div>
            <span className="mb-2 block text-sm font-semibold text-heading">
              Allowed sections
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
              {sections.map((s) => {
                const checked = role.sections.includes(s.key);
                const sensitive = s.key === 'admins' || s.key === 'settings';
                return (
                  <label
                    key={s.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-body"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(i, s.key)}
                      className="h-4 w-4 rounded border-border-base text-accent focus:ring-accent"
                    />
                    <span>
                      {s.label}
                      {sensitive && (
                        <span className="ms-1 text-[11px] text-amber-600">
                          (sensitive)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-end">
        <Button onClick={onSave} loading={saving} disabled={saving}>
          Save roles
        </Button>
      </div>
    </div>
  );
};

export default AdminRolesManager;
