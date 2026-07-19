import * as yup from 'yup';

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
    // Only a 6-char minimum is enforced now; the stronger-password rule is a soft suggestion
    // shown as a notice under the field, not a hard block.
    .min(6, 'Password must be at least 6 characters.'),
});
