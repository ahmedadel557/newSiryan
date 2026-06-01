'use client';
import { Smartphone } from 'lucide-react';
import GoogleIcon from '@/components/auth/shared/GoogleIcon';

interface SocialLoginProps {
  onGoogleLogin: () => void;
  onPhoneLogin: () => void;
}

export default function SocialLogin({ onGoogleLogin, onPhoneLogin }: SocialLoginProps) {
  return (
    <div className="auth-social-row">
      <button className="auth-social-btn" onClick={onGoogleLogin} type="button">
        <GoogleIcon />
        Sign in with Google
      </button>
      <button className="auth-social-btn" onClick={onPhoneLogin} type="button">
        <Smartphone size={15} strokeWidth={1.75} />
        Phone OTP
      </button>
    </div>
  );
}
