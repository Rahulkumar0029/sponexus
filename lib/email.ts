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
  const from = process.env.EMAIL_FROM || "Sponexus <no-reply@sponexus.in>";

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

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
  return sendEmail({
    to,
    subject: "Reset your Sponexus password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your Sponexus password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#f59e0b;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
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
  return sendEmail({
    to,
    subject: "Verify your Sponexus email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Welcome to Sponexus. Please verify your email to activate your account properly.</p>
        <p>
          <a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#f59e0b;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}