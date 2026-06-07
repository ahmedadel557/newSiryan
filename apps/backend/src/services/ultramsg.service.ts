const INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
const TOKEN = process.env.ULTRAMSG_TOKEN;

// UltraMsg expects international format digits without "+", spaces, or dashes
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export const sendWhatsAppOTP = async (phone: string, code: string): Promise<void> => {
  if (!INSTANCE_ID || !TOKEN) {
    console.error('[ultramsg] missing ULTRAMSG_INSTANCE_ID/ULTRAMSG_TOKEN env vars');
    return;
  }

  const body = `Your Siryan verification code is *${code}*. It expires in 5 minutes. Do not share this code with anyone.`;

  try {
    const res = await fetch(`https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: TOKEN, to: normalizePhone(phone), body }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || data?.sent === false || data?.sent === 'false') {
      console.error('[ultramsg] send failed:', data);
    }
  } catch (err) {
    console.error('[ultramsg] failed:', err);
  }
};
