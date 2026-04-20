interface SendAdminOtpEmailArgs {
  to: string;
  name: string;
  otp: string;
}

export async function sendAdminOtpEmail({
  to,
  name,
  otp,
}: SendAdminOtpEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Sponexus Admin <no-reply@sponexus.in>";

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">Admin Login Verification</h2>
      <p>Hello ${name || "Admin"},</p>
      <p>Your Sponexus admin verification code is:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 20px 0; color: #FF7A18;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this code, please secure your account immediately.</p>
      <hr style="margin: 24px 0;" />
      <p style="font-size: 12px; color: #6B7280;">Sponexus Admin Security</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your Sponexus admin login code",
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send admin OTP email: ${errorText}`);
  }

  return response.json();
}