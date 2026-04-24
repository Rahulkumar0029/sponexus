type FraudSignal =
  | "TOO_MANY_RECENT_CHECKOUTS"
  | "TOO_MANY_RECENT_VERIFIES"
  | "TOO_MANY_RECENT_FAILURES"
  | "DUPLICATE_PAYMENT_ID"
  | "ORDER_MISMATCH"
  | "INVALID_SIGNATURE"
  | "MISSING_GATEWAY_ORDER"
  | "RAPID_REPEAT_RENEWAL"
  | "RAPID_REPEAT_CREATE_ORDER"
  | "WEBHOOK_NO_MATCH"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "AMOUNT_INVALID"
  | "COUPON_ABUSE_PATTERN";

type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FraudAssessment = {
  suspicious: boolean;
  score: number;
  severity: FraudSeverity;
  signals: FraudSignal[];
  reasons: string[];
  recommendManualReview: boolean;
};

type FraudInput = {
  recentCheckoutCount?: number;
  recentVerifyCount?: number;
  recentFailureCount?: number;
  recentCreateOrderCount?: number;
  duplicatePaymentDetected?: boolean;
  orderMismatch?: boolean;
  invalidSignature?: boolean;
  missingGatewayOrder?: boolean;
  rapidRepeatRenewal?: boolean;
  webhookNoMatch?: boolean;
  webhookInvalidSignature?: boolean;
  invalidAmount?: boolean;
  couponAbusePattern?: boolean;
};

const FRAUD_WEIGHTS: Record<FraudSignal, number> = {
  TOO_MANY_RECENT_CHECKOUTS: 15,
  TOO_MANY_RECENT_VERIFIES: 20,
  TOO_MANY_RECENT_FAILURES: 20,
  DUPLICATE_PAYMENT_ID: 40,
  ORDER_MISMATCH: 35,
  INVALID_SIGNATURE: 45,
  MISSING_GATEWAY_ORDER: 20,
  RAPID_REPEAT_RENEWAL: 15,
  RAPID_REPEAT_CREATE_ORDER: 15,
  WEBHOOK_NO_MATCH: 20,
  WEBHOOK_INVALID_SIGNATURE: 50,
  AMOUNT_INVALID: 40,
  COUPON_ABUSE_PATTERN: 25,
};

function pushSignal(
  signals: FraudSignal[],
  reasons: string[],
  signal: FraudSignal,
  reason: string
) {
  if (!signals.includes(signal)) {
    signals.push(signal);
    reasons.push(reason);
  }
}

function getSeverity(score: number): FraudSeverity {
  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export function assessFraud(input: FraudInput): FraudAssessment {
  const signals: FraudSignal[] = [];
  const reasons: string[] = [];

  if ((input.recentCheckoutCount ?? 0) >= 6) {
    pushSignal(
      signals,
      reasons,
      "TOO_MANY_RECENT_CHECKOUTS",
      "Too many checkout attempts in a short period."
    );
  }

  if ((input.recentVerifyCount ?? 0) >= 8) {
    pushSignal(
      signals,
      reasons,
      "TOO_MANY_RECENT_VERIFIES",
      "Too many payment verification attempts in a short period."
    );
  }

  if ((input.recentFailureCount ?? 0) >= 5) {
    pushSignal(
      signals,
      reasons,
      "TOO_MANY_RECENT_FAILURES",
      "Too many failed payment-related attempts in a short period."
    );
  }

  if ((input.recentCreateOrderCount ?? 0) >= 6) {
    pushSignal(
      signals,
      reasons,
      "RAPID_REPEAT_CREATE_ORDER",
      "Too many create-order attempts in a short period."
    );
  }

  if (input.duplicatePaymentDetected) {
    pushSignal(
      signals,
      reasons,
      "DUPLICATE_PAYMENT_ID",
      "Duplicate payment id detected."
    );
  }

  if (input.orderMismatch) {
    pushSignal(
      signals,
      reasons,
      "ORDER_MISMATCH",
      "Gateway order id mismatch detected."
    );
  }

  if (input.invalidSignature) {
    pushSignal(
      signals,
      reasons,
      "INVALID_SIGNATURE",
      "Invalid payment signature detected."
    );
  }

  if (input.missingGatewayOrder) {
    pushSignal(
      signals,
      reasons,
      "MISSING_GATEWAY_ORDER",
      "Missing gateway order on payment verification."
    );
  }

  if (input.rapidRepeatRenewal) {
    pushSignal(
      signals,
      reasons,
      "RAPID_REPEAT_RENEWAL",
      "Repeated renewal attempts detected too quickly."
    );
  }

  if (input.webhookNoMatch) {
    pushSignal(
      signals,
      reasons,
      "WEBHOOK_NO_MATCH",
      "Webhook received without a matching payment transaction."
    );
  }

  if (input.webhookInvalidSignature) {
    pushSignal(
      signals,
      reasons,
      "WEBHOOK_INVALID_SIGNATURE",
      "Webhook signature verification failed."
    );
  }

  if (input.invalidAmount) {
    pushSignal(
      signals,
      reasons,
      "AMOUNT_INVALID",
      "Invalid or unsafe payment amount detected."
    );
  }

  if (input.couponAbusePattern) {
    pushSignal(
      signals,
      reasons,
      "COUPON_ABUSE_PATTERN",
      "Coupon usage pattern appears abusive."
    );
  }

  const score = signals.reduce((sum, signal) => sum + FRAUD_WEIGHTS[signal], 0);
  const severity = getSeverity(score);

  return {
    suspicious: signals.length > 0,
    score,
    severity,
    signals,
    reasons,
    recommendManualReview: severity === "HIGH" || severity === "CRITICAL",
  };
}

export function shouldFlagForManualReview(assessment: FraudAssessment) {
  return assessment.recommendManualReview;
}

export function shouldHardBlockFraud(assessment: FraudAssessment) {
  return assessment.severity === "CRITICAL";
}