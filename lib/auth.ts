import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { AdminRole, UserRole } from "@/lib/models/User";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MIN_RANDOM_TOKEN_BYTES = 16;
const MAX_RANDOM_TOKEN_BYTES = 64;
const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = 8;

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "Missing or weak NEXTAUTH_SECRET / JWT_SECRET environment variable"
    );
  }

  return secret;
}

export type AuthRole = UserRole;

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: AuthRole;
  adminRole?: AdminRole;
  type: "access";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string") {
    throw new Error("Password must be a string");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof hashedPassword !== "string" ||
    !password ||
    !hashedPassword
  ) {
    return false;
  }

  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(
  payload: Omit<AuthTokenPayload, "type">,
  expiresIn: string = "7d"
): string {
  if (!payload?.userId || typeof payload.userId !== "string") {
    throw new Error("Valid userId is required for access token");
  }

  if (!payload?.email || typeof payload.email !== "string") {
    throw new Error("Valid email is required for access token");
  }

  if (payload.role !== "ORGANIZER" && payload.role !== "SPONSOR") {
    throw new Error("Valid role is required for access token");
  }

  if (
    payload.adminRole &&
    !["NONE", "SUPPORT_ADMIN", "VERIFICATION_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(
      payload.adminRole
    )
  ) {
    throw new Error("Invalid admin role for access token");
  }

  return jwt.sign(
    {
      userId: payload.userId,
      email: normalizeEmail(payload.email),
      role: payload.role,
      adminRole: payload.adminRole || "NONE",
      type: "access",
    },
    getJwtSecret(),
    {
      expiresIn,
      algorithm: "HS256",
    } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    if (typeof token !== "string" || !token.trim()) {
      return null;
    }

    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as AuthTokenPayload;

    if (
      !decoded ||
      decoded.type !== "access" ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      (decoded.role !== "ORGANIZER" && decoded.role !== "SPONSOR")
    ) {
      return null;
    }

    if (
      decoded.adminRole &&
      !["NONE", "SUPPORT_ADMIN", "VERIFICATION_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(
        decoded.adminRole
      )
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: normalizeEmail(decoded.email),
      role: decoded.role,
      adminRole: decoded.adminRole || "NONE",
      type: "access",
    };
  } catch {
    return null;
  }
}

export function generateRandomToken(bytes: number = 32): string {
  const safeBytes = Math.max(
    MIN_RANDOM_TOKEN_BYTES,
    Math.min(MAX_RANDOM_TOKEN_BYTES, bytes)
  );

  return crypto.randomBytes(safeBytes).toString("hex");
}

export function hashToken(rawToken: string): string {
  if (typeof rawToken !== "string" || !rawToken.trim()) {
    throw new Error("Token must be a non-empty string");
  }

  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateOtpCode(length: number = 6): string {
  const safeLength = Math.max(MIN_OTP_LENGTH, Math.min(MAX_OTP_LENGTH, length));
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < safeLength; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
}

export function hashOtpCode(code: string): string {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("OTP code must be a non-empty string");
  }

  return crypto.createHash("sha256").update(code).digest("hex");
}