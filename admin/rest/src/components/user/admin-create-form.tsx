import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import StickyFooterPanel from '@/components/ui/sticky-footer-panel';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { Routes } from '@/config/routes';
import { useAdminRolesQuery, useCreateAdminMutation } from '@/data/user';
import { isFullAdmin } from '@/utils/auth-utils';
import Link from '@/components/ui/link';

type FormValues = {
  name: string;
  email: string;
  password: string;
  role_id: string; // '' => full super admin
};

const AdminCreateForm = () => {
  const router = useRouter();
  const { roles, loading: rolesLoading } = useAdminRolesQuery();
  const { mutate: createAdmin, isLoading } = useCreateAdminMutation();
  const fullAdmin = isFullAdmin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { role_id: '' } });

  if (!fullAdmin) {
    return (
      <Card>
        <p className="text-body">Only a full super-admin can create admins.</p>
      </Card>
    );
  }

  function onSubmit(values: FormValues) {
    createAdmin(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        role_id: values.role_id || null,
      },
      {
        onError: (error: any) => {
          const data = error?.response?.data;
          if (data && typeof data === 'object') {
            Object.keys(data).forEach((field: any) => {
              const msg = Array.isArray(data[field])
                ? data[field][0]
                : data[field];
              if (['name', 'email', 'password', 'role_id'].includes(field)) {
                setError(field as any, { type: 'manual', message: msg });
              }
            });
          }
        },
        onSuccess: () => {
          router.push(Routes.adminList);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="my-5 flex flex-wrap sm:my-8">
        <Description
          title="Admin information"
          details="Create a new admin. Pick a role to make them a limited moderator, or leave it as Full super admin for complete access."
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <Input
            label="Name"
            {...register('name', { required: 'Name is required' })}
            type="text"
            variant="outline"
            className="mb-4"
            error={errors.name?.message}
            required
          />
          <Input
            label="Email"
            {...register('email', { required: 'Email is required' })}
            type="email"
            variant="outline"
            className="mb-4"
            error={errors.email?.message}
            required
          />
          <PasswordInput
            label="Password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
            })}
            error={errors.password?.message}
            variant="outline"
            className="mb-4"
            required
          />

          <div className="mb-1">
            <label className="mb-2 block text-sm font-semibold leading-none text-body-dark">
              Role
            </label>
            <select
              {...register('role_id')}
              className="h-12 w-full rounded border border-border-base bg-white px-4 text-sm text-heading focus:border-accent focus:outline-none"
              disabled={rolesLoading}
            >
              <option value="">Full super admin (all access)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.sections.length} section
                  {r.sections.length === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-body">
              Need a new role?{' '}
              <Link href={Routes.adminRoles} className="text-accent underline">
                Manage roles
              </Link>
            </p>
          </div>
        </Card>
      </div>
      <StickyFooterPanel className="z-0">
        <div className="mb-4 text-end">
          <Button loading={isLoading} disabled={isLoading}>
            Create admin
          </Button>
        </div>
      </StickyFooterPanel>
    </form>
  );
};

export default AdminCreateForm;
