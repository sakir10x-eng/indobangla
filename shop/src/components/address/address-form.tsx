import Button from '@/components/ui/button';
import Input from '@/components/ui/forms/input';
import AreaPicker from '@/components/address/area-picker';

/** We only ship inside Bangladesh, so the division list is fixed. */
const DIVISIONS = [
  'Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh',
];
import Label from '@/components/ui/forms/label';
import Radio from '@/components/ui/forms/radio/radio';
import { Controller } from 'react-hook-form';
import TextArea from '@/components/ui/forms/text-area';
import { useTranslation } from 'next-i18next';
import * as yup from 'yup';
import { useModalState } from '@/components/ui/modal/modal.context';
import { Form } from '@/components/ui/forms/form';
import { AddressType } from '@/framework/utils/constants';
import { GoogleMapLocation } from '@/types';
import { useUpdateUser } from '@/framework/user';
import GooglePlacesAutocomplete from '@/components/form/google-places-autocomplete';
import { useSettings } from '@/framework/settings';

type FormValues = {
  title: string;
  type: AddressType;
  address: {
    country: string;
    city: string;
    state: string;
    zip: string;
    street_address: string;
  };
  location: GoogleMapLocation;
};

const addressSchema = yup.object().shape({
  type: yup
    .string()
    .oneOf([AddressType.Billing, AddressType.Shipping])
    .required('error-type-required'),
  title: yup.string().required('error-title-required'),
  address: yup.object().shape({
    country: yup.string().required('error-country-required'),
    city: yup.string().required('error-city-required'),
    // State & ZIP are optional (IndoBangla / Bangladesh addresses)
    state: yup.string().nullable(),
    zip: yup.string().nullable(),
    street_address: yup.string().required('error-street-required'),
  }),
});

export const AddressForm: React.FC<any> = ({
  onSubmit,
  defaultValues,
  isLoading,
}) => {
  const { t } = useTranslation('common');
  const { settings } = useSettings();
  return (
    <Form<FormValues>
      onSubmit={onSubmit}
      className="grid h-full grid-cols-2 gap-5"
      //@ts-ignore
      validationSchema={addressSchema}
      useFormProps={{
        shouldUnregister: true,
        defaultValues: {
          ...defaultValues,
          // Shipping is the default address type for a new address.
          type: (defaultValues as any)?.type || AddressType.Shipping,
          address: {
            ...((defaultValues as any)?.address ?? {}),
            // Bangladesh-only shipping — country is fixed (field is read-only).
            // Keep an existing city if there is one, otherwise default to Dhaka.
            country: 'Bangladesh',
            city: (defaultValues as any)?.address?.city || 'Dhaka',
          },
        } as any,
      }}
      resetValues={defaultValues}
    >
      {({ register, control, getValues, setValue, formState: { errors } }) => {
        return (
          <>
            <div>
              <Label>{t('text-type')}</Label>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <Radio
                  id="billing"
                  {...register('type')}
                  type="radio"
                  value={AddressType.Billing}
                  label={t('text-billing')}
                />
                <Radio
                  id="shipping"
                  {...register('type')}
                  type="radio"
                  value={AddressType.Shipping}
                  label={t('text-shipping')}
                />
              </div>
            </div>

            {/* "Title" alone tells the customer nothing — the hint is what makes
                the field answerable. Clears itself as soon as they type. */}
            <Input
              label={t('text-title')}
              placeholder={t('text-address-title-placeholder', {
                defaultValue: 'যেমন: বাসা, অফিস, বন্ধুর বাসা…',
              })}
              {...register('title')}
              error={t(errors.title?.message!)}
              variant="outline"
              className="col-span-2"
            />
            {
              //@ts-ignore
              settings?.useGoogleMap && (
                <div className="col-span-2">
                  <Label>{t('text-location')}</Label>
                  <Controller
                    control={control}
                    name="location"
                    render={({ field: { onChange } }) => (
                      <GooglePlacesAutocomplete
                        register={register}
                        // @ts-ignore
                        onChange={(location: any) => {
                          onChange(location);
                          setValue('address.country', location?.country);
                          setValue('address.city', location?.city);
                          setValue('address.state', location?.state);
                          setValue('address.zip', location?.zip);
                          setValue(
                            'address.street_address',
                            location?.street_address,
                          );
                        }}
                        data={getValues('location')!}
                      />
                    )}
                  />
                </div>
              )
            }

            {/* Country is fixed — we only ship inside Bangladesh. */}
            <Input
              label={t('text-country')}
              {...register('address.country')}
              error={t(errors.address?.country?.message!)}
              variant="outline"
              readOnly
            />

            {/* Division */}
            <div>
              <Label>{t('text-city')}</Label>
              <select
                {...register('address.city')}
                className="mt-1 h-12 w-full rounded border border-border-base px-4 text-sm focus:border-accent focus:outline-none"
              >
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* The delivery area comes straight from RedX's own list, so whatever the
                customer picks is an area the courier actually recognises. */}
            <div className="col-span-2">
              <Controller
                control={control}
                name="address.state"
                render={({ field: { onChange, value } }) => (
                  <AreaPicker value={value} onChange={onChange} />
                )}
              />
            </div>

            <Input
              label={`${t('text-zip')} (${t('text-optional', {
                defaultValue: 'optional',
              })})`}
              {...register('address.zip')}
              error={t(errors.address?.zip?.message!)}
              variant="outline"
            />

            {/* "Street address" reads as one line to most customers, and a courier
                cannot deliver on one line. Name the field for what we actually need
                and spell the parts out — the rider finds the house by the landmark. */}
            <TextArea
              label={t('text-details-address', {
                defaultValue: 'বিস্তারিত ঠিকানা (বর্তমান ঠিকানা)',
              })}
              placeholder={t('text-details-address-placeholder', {
                defaultValue:
                  'বাসা/ফ্ল্যাট নম্বর, রোড, ব্লক, এলাকা ও কাছের ল্যান্ডমার্ক লিখুন।\nযেমন: বাসা ১২ (৩য় তলা), রোড ৫, ব্লক সি, মিরপুর ১০ — ফায়ার সার্ভিসের ঠিক পাশে',
              })}
              {...register('address.street_address')}
              error={t(errors.address?.street_address?.message!)}
              variant="outline"
              className="col-span-2"
            />

            <Button
              className="w-full col-span-2"
              loading={isLoading}
              disabled={isLoading}
            >
              {Boolean(defaultValues) ? t('text-update') : t('text-save')}{' '}
              {t('text-address')}
            </Button>
          </>
        );
      }}
    </Form>
  );
};

export default function CreateOrUpdateAddressForm() {
  const { t } = useTranslation('common');
  const {
    data: { customerId, address, type },
  } = useModalState();

  const { mutate: updateProfile } = useUpdateUser();

  const onSubmit = (values: FormValues) => {
    const formattedInput = {
      id: address?.id,
      // customer_id: customerId,
      title: values.title,
      type: values.type,
      address: {
        ...values.address,
      },
      location: values.location,
    };
    updateProfile({
      id: customerId,
      address: [formattedInput],
    });
  };

  return (
    <div className="min-h-screen p-5 bg-light sm:p-8 md:min-h-0 md:rounded-xl">
      <h1 className="mb-4 text-lg font-semibold text-center text-heading sm:mb-6">
        {address ? t('text-update') : t('text-add-new')} {t('text-address')}
      </h1>
      <AddressForm
        onSubmit={onSubmit}
        defaultValues={{
          title: address?.title ?? '',
          type: address?.type ?? type,
          address: {
            city: address?.address?.city ?? '',
            country: address?.address?.country ?? '',
            state: address?.address?.state ?? '',
            zip: address?.address?.zip ?? '',
            street_address: address?.address?.street_address ?? '',
            ...address?.address,
          },
          location: address?.location ?? '',
        }}
      />
    </div>
  );
}
