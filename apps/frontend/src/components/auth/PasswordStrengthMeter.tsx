'use client';

interface Props {
  password: string;
}

function getStrength(password: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'Weak' };
  if (score === 2) return { level: 2, label: 'Fair' };
  if (score === 3) return { level: 3, label: 'Good' };
  return { level: 4, label: 'Strong' };
}

const COLORS: Record<number, string> = {
  1: 'var(--critical)',
  2: 'var(--caution)',
  3: 'var(--positive)',
  4: 'var(--brand)',
};

export default function PasswordStrengthMeter({ password }: Props) {
  const { level, label } = getStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: bar <= level ? COLORS[level] : 'var(--border-1)',
              transition: 'background var(--dur-base)',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color: COLORS[level], margin: 0 }}>{label}</p>
    </div>
  );
}
