'use client';
import { Circle, CheckCircle2 } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

export function getStrengthChecks(password: string) {
  return [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One uppercase', met: /[A-Z]/.test(password) },
  ];
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = getStrengthChecks(password);
  return (
    <div className="reg-strength">
      {checks.map(({ label, met }) => (
        <span key={label} className={`reg-hint${met ? ' met' : ''}`}>
          {met ? <CheckCircle2 size={13} strokeWidth={2} /> : <Circle size={13} strokeWidth={1.75} />}
          {label}
        </span>
      ))}
    </div>
  );
}
