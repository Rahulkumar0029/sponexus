import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";

export async function getCurrentUser() {
  await connectDB();

  const token = cookies().get("auth-token")?.value;

  if (!token) return null;

  const payload = verifyAccessToken(token);

  if (!payload?.userId) return null;

  const user = await User.findById(payload.userId);

  return user || null;
}