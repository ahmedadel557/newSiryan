import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  await transporter.sendMail({ from: process.env.FROM_EMAIL, to, subject, html });
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
      return sendEmail(to, replace(template.subject), replace(template.html_body));
    }
  } catch {
    console.warn(`[mailer] Template "${templateName}" not found — using fallback`);
  }
  // Fallback: plain notification
  await sendEmail(to, templateName.replace(/_/g, ' '), `<p>${vars.message ?? 'Please check your account.'}</p>`);
};
