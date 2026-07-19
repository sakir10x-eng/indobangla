import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useForm } from 'react-hook-form';
import Card from '@/components/common/card';
import Description from '@/components/ui/description';
import { useRegisterMutation } from '@/data/user';
import { useTranslation } from 'next-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import { customerValidationSchema } from './user-validation-schema';
import { Permission } from '@/types';
import StickyFooterPanel from '@/components/ui/sticky-footer-panel';
import { useRouter } from 'next/router';
import { Routes } from '@/config/routes';
import { toast } from 'react-toastify';

type FormValues = {
  name: string;
  email?: string;
  mobile_number?: string;
  password: string;
  // permission: Permission;
};

const defaultValues = {
  email: '',
  mobile_number: '',
  password: '',
};

const CustomerCreateForm = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { mutate: registerUser, isLoading: loading } = useRegisterMutation();

  const {
    register,
    handleSubmit,
    setError,

    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
    resolver: yupResolver(customerValidationSchema),
  });

  async function onSubmit({ name, email, mobile_number, password }: FormValues) {
    registerUser(
      {
        name,
        email: email || undefined,
        mobile_number: mobile_number || undefined,
        password,
        // permission: Permission.StoreOwner,
      } as any,
      {
        onError: (error: any) => {
          Object.keys(error?.response?.data).forEach((field: any) => {
            setError(field, {
              type: 'manual',
              message: error?.response?.data[field][0],
            });
          });
        },
        onSuccess: (data) => {
          if (data) {
            router.push(Routes.user.list);
          }
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="my-5 flex flex-wrap sm:my-8">
        <Description
          title={t('form:form-title-information')}
          details={t('form:customer-form-info-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <Input
            label={t('form:input-label-name')}
            {...register('name')}
            type="text"
            variant="outline"
            className="mb-4"
            error={t(errors.name?.message!)}
            required
          />
          <Input
            label={`${t('form:input-label-email')} (ঐচ্ছিক)`}
            {...register('email')}
            type="email"
            variant="outline"
            className="mb-4"
            error={t(errors.email?.message!)}
          />
          <Input
            label="মোবাইল নম্বর"
            {...register('mobile_number')}
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            variant="outline"
            className="mb-4"
            error={t(errors.mobile_number?.message!)}
          />
          <PasswordInput
            label={t('form:input-label-password')}
            {...register('password')}
            error={t(errors.password?.message!)}
            variant="outline"
            className="mb-1.5"
            required
          />
          {/* Soft suggestion only — the schema enforces just a 6-character minimum. */}
          <p className="mb-4 text-xs text-amber-600">
            💡 For a stronger password, use 8+ characters with an upper &amp; lower case letter and
            a number. Not required — a 6-character password is accepted.
          </p>
        </Card>
      </div>
      <StickyFooterPanel className="z-0">
        <div className="mb-4 text-end">
          <Button loading={loading} disabled={loading}>
            {t('form:button-label-create-customer')}
          </Button>
        </div>
      </StickyFooterPanel>
    </form>
  );
};

export default CustomerCreateForm;
