import {
  useAdminRolesQuery,
  useAssignAdminRoleMutation,
} from '@/data/user';
import { isFullAdmin } from '@/utils/auth-utils';

/**
 * Shows (and, for a full super-admin, lets you change) the custom role assigned
 * to an admin row on the /users/admins list.
 */
const AdminRoleCell = ({
  id,
  admin_role_id,
}: {
  id: string;
  admin_role_id?: string | null;
}) => {
  const { roles, loading } = useAdminRolesQuery();
  const { mutate: assign, isLoading: saving } = useAssignAdminRoleMutation();
  const fullAdmin = isFullAdmin();

  const current = admin_role_id
    ? roles.find((r) => r.id === admin_role_id)
    : null;
  const label = admin_role_id
    ? current?.name ?? 'Unknown role'
    : 'Full super admin';

  if (!fullAdmin) {
    return (
      <span
        className={
          admin_role_id
            ? 'rounded bg-amber-100 px-2 py-1 text-xs text-amber-700'
            : 'rounded bg-accent/10 px-2 py-1 text-xs text-accent'
        }
      >
        {label}
      </span>
    );
  }

  return (
    <select
      value={admin_role_id ?? ''}
      disabled={saving || loading}
      onChange={(e) =>
        assign({ user_id: id, role_id: e.target.value || null })
      }
      className="h-9 max-w-[190px] rounded border border-border-base bg-white px-2 text-xs text-heading focus:border-accent focus:outline-none disabled:opacity-50"
      title="Change this admin's role"
    >
      <option value="">Full super admin</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
};

export default AdminRoleCell;
