import * as yup from 'yup';
import { passwordRules } from '@/utils/constants';

export const customerValidationSchema = yup.object().shape({
  name: yup.string().required('form:error-name-required'),
  // Email is no longer mandatory — a mobile number can stand in for it. Still format-checked
  // when provided.
  email: yup
    .string()
    .transform((v) => (v ? v : null))
    .nullable()
    .email('form:error-email-format'),
  // Required only when no email is given, so an account is never left with no way to identify it.
  mobile_number: yup
    .string()
    .transform((v) => (v ? v : null))
    .nullable()
    .when('email', {
      is: (email: any) => !email,
      then: (s: any) => s.required('ইমেইল না দিলে মোবাইল নম্বর দিন'),
    }),
  password: yup
    .string()
    .required('form:error-password-required')
    .matches(passwordRules, {
      message:
        'Please create a stronger password. hint: Min 8 characters, 1 Upper case letter, 1 Lower case letter, 1 Numeric digit.',
    }),
});
