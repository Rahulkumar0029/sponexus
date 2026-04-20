export type UserRole = 'ORGANIZER' | 'SPONSOR';

export type AdminRole =
  | 'NONE'
  | 'SUPPORT_ADMIN'
  | 'VERIFICATION_ADMIN'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type AccountStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISABLED'
  | 'PENDING_REVIEW';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;

  // ✅ add this
  adminRole?: AdminRole;
  accountStatus?: AccountStatus;

  firstName: string;
  lastName: string;
  companyName: string;
  avatar?: string;
  bio?: string;
  phone?: string;

  // optional organizer fields because backend returns them
  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;

  // auth/profile fields returned by backend
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;

  // Forgot password fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type User = IUser;

export interface UserSession {
  _id: string;
  name: string;
  email: string;
  role: UserRole;

  // ✅ add this
  adminRole?: AdminRole;
  accountStatus?: AccountStatus;

  companyName?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  companyName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Omit<User, 'password'>;
  token?: string;
}