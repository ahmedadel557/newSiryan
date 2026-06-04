'use client';
import Link from 'next/link';
import {
  Mail,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/hooks/shared';
import PasswordInput from '@/components/shared/PasswordInput';
import AuthDivider from '@/components/auth/shared/AuthDivider';
import SocialLogin from '@/components/auth/login/SocialLogin';
import { useState } from 'react';

const schema = yup.object({
  emailOrPhone: yup.string().required('Email or phone is required'),
  password: yup.string().required('Password is required'),
});

type FormValues = yup.InferType<typeof schema>;

interface LoginFormProps {
  onPhoneLogin: () => void;
}

export default function LoginForm({ onPhoneLogin }: LoginFormProps) {
  const { login } = useAuth();
  const [apiError, setApiError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setApiError('');
    try {
      await login({ email: data.emailOrPhone.trim().toLowerCase(), password: data.password, rememberMe });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message;
      const status = e?.response?.status;
      if (status === 403 && msg?.toLowerCase().includes('pending')) {
        setApiError('__pending__');
      } else if (status === 403) {
        setApiError(msg || '__rejected__');
      } else {
        setApiError(msg || 'Invalid credentials.');
      }
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  }

  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-lede">Sign in to access your health dashboard.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">Email or phone</label>
          <div className="auth-input-wrap">
            <Mail size={16} strokeWidth={1.75} />
            <input
              className="input"
              type="text"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('emailOrPhone')}
            />
          </div>
          {errors.emailOrPhone && <p className="auth-field-error">{errors.emailOrPhone.message}</p>}
        </div>

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          registration={register('password')}
          error={errors.password?.message}
          autoComplete="current-password"
        />

        <div className="auth-remember-row">
          <label className="auth-remember-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="auth-checkbox"
            />
            <span>Remember me</span>
          </label>
          <Link href="/auth/forgot-password" className="auth-forgot">
            Forgot password?
          </Link>
        </div>

        {apiError === '__pending__' ? (
          <div
            className="auth-err"
            style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}
          >
            <Clock size={16} strokeWidth={1.75} />
            <span>Your account is pending admin approval. We&apos;ll email you when it&apos;s ready.</span>
          </div>
        ) : apiError ? (
          <div className="auth-err">
            <AlertCircle size={16} strokeWidth={1.75} />
            <span>{apiError}</span>
          </div>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          disabled={isSubmitting}
        >
          <ArrowRight size={16} strokeWidth={1.75} />
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <AuthDivider />

      <SocialLogin onGoogleLogin={handleGoogleLogin} onPhoneLogin={onPhoneLogin} />

      <p className="auth-switch">
        New to Siryan? <Link href="/auth/register">Create an account →</Link>
      </p>
    </>
  );
}
