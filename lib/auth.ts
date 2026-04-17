import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const SALT_ROUNDS = 10;

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET or JWT_SECRET environment variable");
  }

  return secret;
}

export type AuthRole = "ORGANIZER" | "SPONSOR";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: AuthRole;
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

    if (!decoded || decoded.type !== "access" || !decoded.userId || !decoded.email || !decoded.role) {
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