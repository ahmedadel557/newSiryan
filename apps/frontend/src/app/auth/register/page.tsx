"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/shared/AuthShell";
import RegisterHeader from "@/components/auth/register/RegisterHeader";
import PatientForm from "@/components/auth/register/PatientForm";
import StaffForm from "@/components/auth/register/StaffForm";
import StaffSuccessScreen from "@/components/auth/register/StaffSuccessScreen";

export default function RegisterPage() {
  const router = useRouter();
  const [tabType, setTabType] = useState<"patient" | "staff">("patient");
  const [staffSuccess, setStaffSuccess] = useState<{ email: string } | null>(null);

  function switchTab(t: "patient" | "staff") {
    setTabType(t);
  }

  return (
    <AuthShell maxWidth={460}>
      {/* Staff success screen */}
      {staffSuccess ? (
        <StaffSuccessScreen
          email={staffSuccess.email}
          onGoHome={() => router.push("/")}
        />
      ) : (
        <>
          <RegisterHeader tabType={tabType} onSwitchTab={switchTab} />

          <div className="auth-form-content">
            {tabType === "patient" ? (
              <PatientForm />
            ) : (
              <StaffForm onSuccess={(email) => setStaffSuccess({ email })} />
            )}

            <p className="auth-switch">
              Already have an account?{" "}
              <Link href="/auth/login">Sign in →</Link>
            </p>
          </div>
        </>
      )}
    </AuthShell>
  );
}
