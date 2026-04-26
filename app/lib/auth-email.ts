import { Resend } from "resend";

type AuthEmailKind = "password_reset" | "email_verify";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

function getEmailContent(kind: AuthEmailKind, token: string) {
  if (kind === "password_reset") {
    const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return {
      subject: "Reset your GensanWorks password",
      text: `You requested a password reset. Open this link to continue: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset Password</a></p>`,
    };
  }

  const verifyUrl = `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: "Verify your GensanWorks email",
    text: `Please verify your email by opening this link: ${verifyUrl}`,
    html: `<p>Please verify your email.</p><p><a href="${verifyUrl}">Verify Email</a></p>`,
  };
}

export async function sendAuthLifecycleEmail(params: {
  kind: AuthEmailKind;
  to: string;
  token: string;
  requestId: string;
}) {
  if (!resendClient || !fromEmail) {
    console.warn("Auth email send skipped: missing Resend configuration", {
      requestId: params.requestId,
      kind: params.kind,
      to: params.to,
      hasApiKey: Boolean(resendApiKey),
      hasFromEmail: Boolean(fromEmail),
    });
    return { sent: false as const, reason: "missing_config" as const };
  }

  const content = getEmailContent(params.kind, params.token);
  await resendClient.emails.send({
    from: fromEmail,
    to: params.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return { sent: true as const };
}

export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!resendClient || !fromEmail) {
    console.warn("Notification email send skipped: missing Resend configuration", {
      to: params.to,
    });
    return { sent: false as const, reason: "missing_config" as const };
  }

  await resendClient.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return { sent: true as const };
}
