import {
  AuthResponse,
  LoginInput,
  RegisterInput,
  User,
  ChangePasswordInput,
  ForgetPasswordInput,
  VerifyForgetPasswordTokenInput,
  ResetPasswordInput,
  MakeAdminInput,
  AdminRole,
  AdminRolesResponse,
  CreateAdminInput,
  AssignAdminRoleInput,
  BlockUserInput,
  WalletPointsInput,
  UpdateUser,
  QueryOptionsType,
  UserPaginator,
  UserQueryOptions,
  VendorQueryOptionsType,
  KeyInput,
  LicensedDomainPaginator,
  LicenseAdditionalData,
} from '@/types';
import { API_ENDPOINTS } from './api-endpoints';
import { HttpClient } from './http-client';

export const userClient = {
  me: () => {
    return HttpClient.get<User>(API_ENDPOINTS.ME);
  },
  login: (variables: LoginInput) => {
    return HttpClient.post<AuthResponse>(API_ENDPOINTS.TOKEN, variables);
  },
  // Admin 2FA: (re)send the login OTP (phone only needed while enrolling) and verify it.
  adminOtpRequest: (variables: { ticket: string; phone?: string }) => {
    return HttpClient.post<{ success: boolean; destination?: string; message?: string }>(
      API_ENDPOINTS.ADMIN_OTP_REQUEST,
      variables,
    );
  },
  adminOtpVerify: (variables: { ticket: string; code: string }) => {
    return HttpClient.post<AuthResponse>(API_ENDPOINTS.ADMIN_OTP_VERIFY, variables);
  },
  logout: () => {
    return HttpClient.post<any>(API_ENDPOINTS.LOGOUT, {});
  },
  register: (variables: RegisterInput) => {
    return HttpClient.post<AuthResponse>(API_ENDPOINTS.REGISTER, variables);
  },
  update: ({ id, input }: { id: string; input: UpdateUser }) => {
    return HttpClient.put<User>(`${API_ENDPOINTS.USERS}/${id}`, input);
  },
  changePassword: (variables: ChangePasswordInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.CHANGE_PASSWORD, variables);
  },
  forgetPassword: (variables: ForgetPasswordInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.FORGET_PASSWORD, variables);
  },
  verifyForgetPasswordToken: (variables: VerifyForgetPasswordTokenInput) => {
    return HttpClient.post<any>(
      API_ENDPOINTS.VERIFY_FORGET_PASSWORD_TOKEN,
      variables
    );
  },
  resetPassword: (variables: ResetPasswordInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.RESET_PASSWORD, variables);
  },
  makeAdmin: (variables: MakeAdminInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.MAKE_ADMIN, variables);
  },
  // custom sub-admin roles
  fetchAdminRoles: () => {
    return HttpClient.get<AdminRolesResponse>(API_ENDPOINTS.ADMIN_ROLES);
  },
  saveAdminRoles: (roles: AdminRole[]) => {
    return HttpClient.put<AdminRolesResponse>(API_ENDPOINTS.ADMIN_ROLES, {
      roles,
    });
  },
  createAdmin: (variables: CreateAdminInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.CREATE_ADMIN, variables);
  },
  assignAdminRole: (variables: AssignAdminRoleInput) => {
    return HttpClient.put<any>(API_ENDPOINTS.ADMIN_ROLE_ASSIGN, variables);
  },
  block: (variables: BlockUserInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.BLOCK_USER, variables);
  },
  unblock: (variables: BlockUserInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.UNBLOCK_USER, variables);
  },
  addWalletPoints: (variables: WalletPointsInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.ADD_WALLET_POINTS, variables);
  },
  addLicenseKey: (variables: KeyInput) => {
    return HttpClient.post<any>(API_ENDPOINTS.ADD_LICENSE_KEY_VERIFY, variables);
  },

  fetchUsers: ({ name, ...params }: Partial<UserQueryOptions>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.USERS, {
      // The users search box is used for both names and phone numbers, so match
      // name OR mobile_number (searchJoin 'or') using the same term. Without this
      // only `name` was searched, so a phone number never found anyone.
      searchJoin: 'or',
      with: 'wallet',
      ...params,
      search: HttpClient.formatSearchParams({ name, mobile_number: name }),
    });
  },
  fetchAdmins: ({ ...params }: Partial<UserQueryOptions>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.ADMIN_LIST, {
      searchJoin: 'and',
      with: 'wallet;permissions;profile',
      ...params,
    });
  },
  fetchUser: ({ id }: { id: string }) => {
    return HttpClient.get<User>(`${API_ENDPOINTS.USERS}/${id}`);
  },
  resendVerificationEmail: () => {
    return HttpClient.post<any>(API_ENDPOINTS.SEND_VERIFICATION_EMAIL, {});
  },
  updateEmail: ({ email }: { email: string }) => {
    return HttpClient.post<any>(API_ENDPOINTS.UPDATE_EMAIL, { email });
  },
  fetchVendors: ({ is_active, ...params }: Partial<UserQueryOptions>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.VENDORS_LIST, {
      searchJoin: 'and',
      with: 'wallet;permissions;profile',
      is_active,
      ...params,
    });
  },
  fetchCustomers: ({ ...params }: Partial<UserQueryOptions>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.CUSTOMERS, {
      searchJoin: 'and',
      with: 'wallet',
      ...params,
    });
  },
  getMyStaffs: ({ is_active, shop_id, name, ...params }: Partial<UserQueryOptions & { shop_id: string }>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.MY_STAFFS, {
      searchJoin: 'and',
      shop_id,
      ...params,
      search: HttpClient.formatSearchParams({ name, is_active })
    });
  },
  getAllStaffs: ({ is_active, name, ...params }: Partial<UserQueryOptions>) => {
    return HttpClient.get<UserPaginator>(API_ENDPOINTS.ALL_STAFFS, {
      searchJoin: 'and',
      ...params,
      search: HttpClient.formatSearchParams({ name, is_active }),
    });
  },
  
};
