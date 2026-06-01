"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/shared/AuthShell";
import LoginHeader from "@/components/auth/login/LoginHeader";
import LoginForm from "@/components/auth/login/LoginForm";
import PhoneLogin from "@/components/auth/login/PhoneLogin";

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
  const [showPhone, setShowPhone] = useState(false);

  return (
    <AuthShell>
      <Suspense fallback={null}>
        <SuccessBanner />
      </Suspense>

      <LoginHeader />

      <div className="auth-form-content">
        {showPhone ? (
          <PhoneLogin onBack={() => setShowPhone(false)} />
        ) : (
          <LoginForm onPhoneLogin={() => setShowPhone(true)} />
        )}
      </div>
    </AuthShell>
  );
}
