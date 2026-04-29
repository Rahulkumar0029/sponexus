import crypto from "crypto";
import Razorpay from "razorpay";

import {
  CURRENCY_SUBUNIT_MULTIPLIER,
  PAYMENT_CURRENCY,
} from "@/lib/payments/constants";

/* ===============================
   SINGLETON INSTANCE
=================================*/
let razorpayInstance: Razorpay | null = null;

/* ===============================
   ENV VALIDATION
=================================*/
export function assertRazorpayEnv() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay config. Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET."
    );
  }

  return { keyId, keySecret };
}

/* ===============================
   CLIENT
=================================*/
export function getRazorpayClient() {
  if (razorpayInstance) return razorpayInstance;

  const { keyId, keySecret } = assertRazorpayEnv();

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/* ===============================
   AMOUNT CONVERSION
=================================*/
export function convertRupeesToSubunits(amountInRupees: number) {
  if (
    typeof amountInRupees !== "number" ||
    !Number.isFinite(amountInRupees) ||
    amountInRupees <= 0
  ) {
    throw new Error("Invalid rupee amount.");
  }

  return Math.round(amountInRupees * CURRENCY_SUBUNIT_MULTIPLIER);
}

/* ===============================
   CREATE ORDER
=================================*/
export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const client = getRazorpayClient();

  const amount = convertRupeesToSubunits(params.amountInRupees);

  try {
    const order = await client.orders.create({
      amount,
      currency: PAYMENT_CURRENCY,
      receipt: params.receipt,
      notes: params.notes ?? {},
    });

    return order;
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error?.message);

    throw new Error("Failed to create Razorpay order.");
  }
}

/* ===============================
   VERIFY PAYMENT SIGNATURE
=================================*/
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) 

{
  const { keySecret } = assertRazorpayEnv();

  if (
    !params.razorpayOrderId ||
    !params.razorpayPaymentId ||
    !params.razorpaySignature
  ) {
    return false;
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(params.razorpaySignature)
    );
  } catch {
    return false; // prevents crash if length mismatch
  }
}

export async function fetchRazorpayPayment(razorpayPaymentId: string) {
  if (!razorpayPaymentId || typeof razorpayPaymentId !== "string") {
    throw new Error("Invalid Razorpay payment id.");
  }

  const client = getRazorpayClient();

  try {
    return await client.payments.fetch(razorpayPaymentId);
  } catch (error: any) {
    console.error("Razorpay payment fetch failed:", error?.message);
    throw new Error("Failed to fetch Razorpay payment.");
  }
}