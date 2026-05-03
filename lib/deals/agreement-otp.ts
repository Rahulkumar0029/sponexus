import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export function generateAgreementOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;

  return String(crypto.randomInt(min, max + 1));
}

export function hashAgreementOtp(otp: string) {
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
}

export function getAgreementOtpExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiresAt;
}

export function isAgreementOtpExpired(expiresAt?: Date | string | null) {
  if (!expiresAt) return true;

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) return true;

  return parsed.getTime() < Date.now();
}

export function verifyAgreementOtpHash(inputOtp: string, storedHash: string) {
  if (!inputOtp || !storedHash) return false;

  const inputHash = hashAgreementOtp(inputOtp);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(storedHash)
    );
  } catch {
    return false;
  }
}