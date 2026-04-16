export type UserRole = 'ORGANIZER' | 'SPONSOR';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  companyName: string;
  avatar?: string;
  bio?: string;
  phone?: string;

  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;

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