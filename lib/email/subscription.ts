import { EMAIL } from "@/lib/subscription/constants";

type SubscriptionEmailArgs = {
  to: string;
  name: string;
  planName: string;
  amount: number;
  startDate: Date | string;
  endDate: Date | string;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ✅ Basic email validation
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ✅ Safe app URL
function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
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
  const from = process.env.EMAIL_FROM || EMAIL.BILLING_FROM;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  // ✅ Validate email
  if (!isValidEmail(to)) {
    throw new Error("Invalid recipient email");
  }

  // ✅ Timeout protection
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend email failed: ${errorText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getSubscriptionActivatedHtml({
  name,
  planName,
  amount,
  startDate,
  endDate,
}: SubscriptionEmailArgs) {
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const appUrl = getAppUrl();

  return `
    <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#ffffff;">
      <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
        <div style="background:linear-gradient(135deg,#07152F 0%,#020617 100%);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="margin:0;font-size:28px;">Sponexus</h1>
            <p style="margin:10px 0 0;color:#94A3B8;font-size:14px;">Subscription Confirmation</p>
          </div>

          <h2 style="margin:0 0 14px;font-size:22px;">Your plan is now active</h2>

          <p style="margin:0 0 14px;">Hi ${name},</p>

          <p style="margin:0 0 18px;">
            Your <strong>${planName}</strong> subscription has been activated successfully.
          </p>

          <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:18px;margin:22px 0;">
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Amount Paid:</strong> ₹${amount}</p>
            <p><strong>Start Date:</strong> ${formattedStartDate}</p>
            <p><strong>Valid Till:</strong> ${formattedEndDate}</p>
          </div>

          <a href="${appUrl}/pricing"
             style="display:inline-block;background:#FF7A18;color:#020617;padding:12px 20px;border-radius:12px;font-weight:700;">
            View Your Plan
          </a>

          <p style="margin-top:20px;color:#94A3B8;">
            Support: ${EMAIL.SUPPORT_EMAIL}
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendSubscriptionActivatedEmail(
  args: SubscriptionEmailArgs
) {
  return sendEmail({
    to: args.to,
    subject: "Your Sponexus subscription is now active",
    html: getSubscriptionActivatedHtml(args),
  });
}

export async function sendSubscriptionRenewedEmail(
  args: SubscriptionEmailArgs
) {
  return sendEmail({
    to: args.to,
    subject: "Your Sponexus plan has been renewed successfully",
    html: getSubscriptionActivatedHtml(args),
  });
}