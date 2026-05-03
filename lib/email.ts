interface PasswordResetEmailArgs {
  to: string;
  name: string;
  resetLink: string;
}

interface VerificationEmailArgs {
  to: string;
  name: string;
  verificationLink: string;
}

interface EmailChangeVerificationArgs {
  to: string;
  name: string;
  verificationLink: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function safeFetch(url: string, options: RequestInit, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Sponexus <no-reply@sponexus.app>";
  const replyTo = process.env.EMAIL_REPLY_TO;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  if (!isValidEmail(to)) {
    throw new Error("Invalid recipient email");
  }

  const payload: Record<string, unknown> = {
    from,
    to,
    subject,
    html,
  };

  if (replyTo && isValidEmail(replyTo)) {
    payload.reply_to = replyTo;
  }

  const response = await safeFetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    10000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${errorText}`);
  }

  return response.json();
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: PasswordResetEmailArgs) {
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: "Reset your Sponexus password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Reset your password</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Sponexus password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#FF7A18;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationLink,
}: VerificationEmailArgs) {
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: "Verify your Sponexus email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Verify your email</h2>
        <p>Hi ${safeName},</p>
        <p>Welcome to Sponexus. Please verify your email to activate your account properly.</p>
        <p>
          <a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#FF7A18;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerificationEmail({
  to,
  name,
  verificationLink,
}: EmailChangeVerificationArgs) {
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: "Confirm your new Sponexus email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Confirm your new email</h2>
        <p>Hi ${safeName},</p>
        <p>You requested to change your Sponexus account email.</p>
        <p>
          <a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#FF7A18;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
            Confirm New Email
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

interface AgreementOtpEmailArgs {
  to: string;
  name: string;
  dealTitle: string;
  otp: string;
  role: "ORGANIZER" | "SPONSOR";
}

export async function sendAgreementOtpEmail({
  to,
  name,
  dealTitle,
  otp,
  role,
}: AgreementOtpEmailArgs) {
  const safeName = escapeHtml(name || role.toLowerCase());
  const safeDealTitle = escapeHtml(dealTitle || "Deal Agreement");
  const safeOtp = escapeHtml(otp);

  return sendEmail({
    to,
    subject: `Sponexus agreement verification code for ${safeDealTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Sponexus Agreement Verification</h2>

        <p>Hi ${safeName},</p>

        <p>
          Your verification code for signing the deal agreement
          <strong>${safeDealTitle}</strong> is:
        </p>

        <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;display:inline-block;border-radius:12px;">
          ${safeOtp}
        </div>

        <p>This code will expire in 10 minutes.</p>

        <p>
          Do not share this code with anyone. Use it only if you are confirming this agreement on Sponexus.
        </p>

        <p>Team Sponexus</p>
      </div>
    `,
  });
}