import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { AdminRole, UserRole } from "@/lib/models/User";

const SALT_ROUNDS = 10;

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET or JWT_SECRET environment variable");
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

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(
  payload: Omit<AuthTokenPayload, "type">,
  expiresIn: string = "7d"
): string {
  return jwt.sign(
    {
      ...payload,
      type: "access",
    },
    getJwtSecret(),
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;

    if (
      !decoded ||
      decoded.type !== "access" ||
      !decoded.userId ||
      !decoded.email ||
      !decoded.role
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateOtpCode(length: number = 6): string {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
}

export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}