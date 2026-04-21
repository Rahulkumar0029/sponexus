import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User, { IUser } from "@/lib/models/User";

export async function getCurrentUser(): Promise<IUser | null> {
  await connectDB();

  const cookieStore = cookies();

  const token =
    cookieStore.get("auth-token")?.value ||
    cookieStore.get("token")?.value ||
    cookieStore.get("accessToken")?.value;

  if (!token) return null;

  const payload = verifyAccessToken(token);

  if (!payload?.userId) return null;

  const user = await User.findById(payload.userId).select(
    "+passwordChangedAt accountStatus isDeleted adminRole role email firstName lastName companyName"
  );

  if (!user) return null;

  // 🚨 BLOCK deleted users
  if (user.isDeleted) return null;

  // 🚨 BLOCK suspended / disabled users
  if (
    user.accountStatus === "SUSPENDED" ||
    user.accountStatus === "DISABLED"
  ) {
    return null;
  }

  // 🔐 TOKEN INVALIDATION (important security layer)
  if (user.passwordChangedAt) {
    const passwordChangedTime = Math.floor(
      new Date(user.passwordChangedAt).getTime() / 1000
    );

    const tokenIssuedAt = (payload as any).iat;

    if (tokenIssuedAt && tokenIssuedAt < passwordChangedTime) {
      return null;
    }
  }

  return user;
}