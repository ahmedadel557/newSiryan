"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Mail,
  Lock,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  Pill,
  HeartPulse,
  Video,
  ShieldCheck,
  Smartphone,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/services/api.client";
import PasswordInput from "@/components/shared/PasswordInput";
import Image from "next/image";

const schema = yup.object({
  emailOrPhone: yup.string().required("Email or phone is required"),
  password: yup.string().required("Password is required"),
});
type FormValues = yup.InferType<typeof schema>;

const scenes = [
  { gradient: "linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)" },
  { gradient: "linear-gradient(135deg, #031412 0%, #163832 50%, #b4d4be 100%)" },
  { gradient: "linear-gradient(135deg, #1a8fc4 0%, #235347 60%, #DAF1DE 100%)" },
];

const features = [
  { Icon: Sparkles, text: "AI symptom check", x: "8%", y: "18%", delay: "0s" },
  { Icon: CalendarCheck, text: "Same-day booking", x: "5%", y: "55%", delay: "0.6s" },
  { Icon: Pill, text: "Pharmacy delivery", x: "12%", y: "82%", delay: "1.2s" },
  { Icon: HeartPulse, text: "Complete records", x: "72%", y: "12%", delay: "0.3s" },
  { Icon: Video, text: "Video consultations", x: "78%", y: "48%", delay: "0.9s" },
  { Icon: ShieldCheck, text: "Insurance built in", x: "68%", y: "80%", delay: "1.5s" },
];

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SuccessBanner() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  if (!message) return null;
  return (
    <div
      className="px-4 py-3 rounded-[var(--radius-md)] text-[13px] font-medium mb-3"
      style={{ background: "var(--positive-soft-bg)", color: "var(--positive-soft-fg)" }}
    >
      {message}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [bgIndex, setBgIndex] = useState(0);
  const [apiError, setApiError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [phoneStep, setPhoneStep] = useState<"idle" | "enter-phone" | "enter-otp">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setBgIndex((i) => (i + 1) % scenes.length), 5000);
    return () => clearInterval(t);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setApiError("");
    try {
      await login({ email: data.emailOrPhone.trim().toLowerCase(), password: data.password });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message;
      const status = e?.response?.status;
      if (status === 403 && msg?.toLowerCase().includes("pending")) {
        setApiError("__pending__");
      } else if (status === 403) {
        setApiError(msg || "__rejected__");
      } else {
        setApiError(msg || "Invalid credentials.");
      }
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  }

  async function handleSendOtp() {
    if (!phoneNumber.trim()) return;
    setPhoneError("");
    setPhoneBusy(true);
    try {
      await apiClient.post("/auth/phone/send-otp", { phone: phoneNumber.trim() });
      setPhoneStep("enter-otp");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPhoneError(msg || "Failed to send OTP. Please try again.");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return;
    setPhoneError("");
    setPhoneBusy(true);
    try {
      const res = await apiClient.post<{ data: { access_token: string; refresh_token: string } }>(
        "/auth/phone/verify-otp",
        {
          phone: phoneNumber.trim(),
          otp: otp.trim(),
        },
      );
      window.location.href = "/dashboard/patient";
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPhoneError(msg || "Invalid OTP. Please try again.");
    } finally {
      setPhoneBusy(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        {scenes.map((s, i) => (
          <div
            key={i}
            className={`auth-bg-layer ${i === bgIndex ? "is-active" : ""}`}
            style={{ background: s.gradient }}
          />
        ))}
        <div className="auth-floats">
          {features.map(({ Icon, text, x, y, delay }, i) => (
            <div key={i} className="auth-float" style={{ left: x, top: y, animationDelay: delay }}>
              <Icon size={14} strokeWidth={1.75} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <svg className="auth-pulse" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,100 L300,100 L350,30 L400,170 L450,60 L500,140 L550,100 L1200,100"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="auth-watermark">
          <Image src="/assets/siryan-logo.png" alt="Logo" width={64} height={64} />
        </div>
      </div>

      {/* Card */}
      <div className="auth-card-wrap">
        <Suspense fallback={null}>
          <SuccessBanner />
        </Suspense>
        <div className="auth-card">
          <div className="auth-card-header">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/siryan-logo.png"
                alt="Siryan Logo"
                className="auth-logo"
                width={64}
                height={64}
                priority
              />
              <span className="auth-brand">Siryan</span>
            </Link>
          </div>

          <div className="auth-form-content">
            {/* ── Phone: enter phone number ── */}
            {phoneStep === "enter-phone" && (
              <>
                <button
                  className="auth-back-btn"
                  onClick={() => {
                    setPhoneStep("idle");
                    setPhoneError("");
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={2} /> Back
                </button>
                <h1 className="auth-title">Phone sign‑in</h1>
                <p className="auth-lede">Enter your mobile number to receive a one-time code.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Phone number</label>
                    <div className="auth-input-wrap">
                      <Smartphone size={16} strokeWidth={1.75} />
                      <input
                        className="input"
                        type="tel"
                        placeholder="+1 555 000 0000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                        autoFocus
                      />
                    </div>
                  </div>
                  {phoneError && (
                    <div className="auth-err">
                      <AlertCircle size={16} strokeWidth={1.75} />
                      <span>{phoneError}</span>
                    </div>
                  )}
                  <button
                    className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                    onClick={handleSendOtp}
                    disabled={phoneBusy || !phoneNumber.trim()}
                  >
                    <ArrowRight size={16} strokeWidth={1.75} />
                    {phoneBusy ? "Sending…" : "Send OTP"}
                  </button>
                </div>
              </>
            )}

            {/* ── Phone: enter OTP ── */}
            {phoneStep === "enter-otp" && (
              <>
                <button
                  className="auth-back-btn"
                  onClick={() => {
                    setPhoneStep("enter-phone");
                    setOtp("");
                    setPhoneError("");
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={2} /> Back
                </button>
                <h1 className="auth-title">Enter OTP</h1>
                <p className="auth-lede">
                  Code sent to <strong>{phoneNumber}</strong>. Check your messages.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="field">
                    <label className="field-label">One-time code</label>
                    <input
                      className="input auth-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      autoFocus
                    />
                  </div>
                  {phoneError && (
                    <div className="auth-err">
                      <AlertCircle size={16} strokeWidth={1.75} />
                      <span>{phoneError}</span>
                    </div>
                  )}
                  <button
                    className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                    onClick={handleVerifyOtp}
                    disabled={phoneBusy || otp.length < 4}
                  >
                    <ArrowRight size={16} strokeWidth={1.75} />
                    {phoneBusy ? "Verifying…" : "Verify"}
                  </button>
                  <button
                    className="auth-resend-btn"
                    onClick={() => {
                      setOtp("");
                      handleSendOtp();
                    }}
                    disabled={phoneBusy}
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}

            {/* ── Default: email / password ── */}
            {phoneStep === "idle" && (
              <>
                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-lede">Sign in to access your health dashboard.</p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Email or phone</label>
                    <div className="auth-input-wrap">
                      <Mail size={16} strokeWidth={1.75} />
                      <input
                        className="input"
                        type="text"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...register("emailOrPhone")}
                      />
                    </div>
                    {errors.emailOrPhone && <p className="auth-field-error">{errors.emailOrPhone.message}</p>}
                  </div>

                  <PasswordInput
                    label="Password"
                    placeholder="••••••••"
                    registration={register("password")}
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

                  {apiError === "__pending__" ? (
                    <div
                      className="auth-err"
                      style={{ background: "var(--caution-soft-bg)", color: "var(--caution-soft-fg)" }}
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
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>or continue with</span>
                </div>

                <div className="auth-social-row">
                  <button className="auth-social-btn" onClick={handleGoogleLogin} type="button">
                    <GoogleIcon />
                    Sign in with Google
                  </button>
                  <button className="auth-social-btn" onClick={() => setPhoneStep("enter-phone")} type="button">
                    <Smartphone size={15} strokeWidth={1.75} />
                    Phone OTP
                  </button>
                </div>

                <p className="auth-switch">
                  New to Siryan? <Link href="/auth/register">Create an account →</Link>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="auth-trust">
          <span>
            <Lock size={13} strokeWidth={1.75} /> 256-bit encryption
          </span>
          <span>
            <ShieldCheck size={13} strokeWidth={1.75} /> HIPAA compliant
          </span>
        </div>
      </div>
    </div>
  );
}
