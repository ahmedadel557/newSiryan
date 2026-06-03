import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "Siryan <noreply@siryan.xyz>";

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[mailer] failed:', err);
  }
};

export const sendEmailVerificationOTP = async (email: string, code: string, firstName: string): Promise<void> => {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#235347;margin-bottom:8px;">Verify your Siryan account</h2>
      <p>Hi ${firstName || 'there'},</p>
      <p>Your email verification code is:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:24px;background:#f3f4f6;border-radius:8px;margin:20px 0;">
        ${code}
      </div>
      <p>This code is valid for <strong>30 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">If you did not create a Siryan account, you can safely ignore this email.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:32px;">Siryan Health Platform</p>
    </div>
  `;
  try {
    await resend.emails.send({ from: FROM, to: email, subject: 'Verify your Siryan account', html });
  } catch (err) {
    console.error('[mailer] failed:', err);
  }
};

export const sendForgotPasswordOTP = async (email: string, code: string, firstName: string): Promise<void> => {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#235347;margin-bottom:8px;">Reset your Siryan password</h2>
      <p>Hi ${firstName || 'there'},</p>
      <p>Your password reset code is:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:24px;background:#f3f4f6;border-radius:8px;margin:20px 0;">
        ${code}
      </div>
      <p>This code is valid for <strong>30 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">If you didn't request a password reset, please ignore this email — your password will not change.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:32px;">Siryan Health Platform</p>
    </div>
  `;
  try {
    await resend.emails.send({ from: FROM, to: email, subject: 'Reset your Siryan password', html });
  } catch (err) {
    console.error('[mailer] failed:', err);
  }
};

export const sendTemplatedEmail = async (
  to: string,
  templateName: string,
  vars: Record<string, string> = {},
): Promise<void> => {
  try {
    const EmailTemplate = (await import('../models/EmailTemplate')).default;
    const template = await EmailTemplate.findOne({ name: templateName }).lean();
    if (template) {
      const replace = (str: string) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
      await sendEmail(to, replace(template.subject), replace(template.html_body));
      return;
    }
  } catch {
    console.warn(`[mailer] Template "${templateName}" not found — using fallback`);
  }
  await sendEmail(to, templateName.replace(/_/g, ' '), `<p>${vars.message ?? 'Please check your account.'}</p>`);
};
