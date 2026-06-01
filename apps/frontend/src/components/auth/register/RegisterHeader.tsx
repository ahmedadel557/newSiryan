"use client";
import Link from "next/link";
import Image from "next/image";
import { User, Briefcase } from "lucide-react";

interface RegisterHeaderProps {
  tabType: "patient" | "staff";
  onSwitchTab: (tab: "patient" | "staff") => void;
}

export default function RegisterHeader({ tabType, onSwitchTab }: RegisterHeaderProps) {
  return (
    <>
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

      <h1 className="auth-title my-5 text-center">Create your account</h1>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-elevated)",
          borderRadius: 8,
          padding: 4,
          marginBottom: 18,
        }}
      >
        <TabButton
          active={tabType === "patient"}
          onClick={() => onSwitchTab("patient")}
          icon={<User size={13} strokeWidth={2} style={{ display: "inline", verticalAlign: "middle" }} />}
          label="Patient"
        />
        <TabButton
          active={tabType === "staff"}
          onClick={() => onSwitchTab("staff")}
          icon={<Briefcase size={13} strokeWidth={2} style={{ display: "inline", verticalAlign: "middle" }} />}
          label="Staff"
        />
      </div>
    </>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn"
      style={{
        flex: 1,
        padding: "7px 0",
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        background: active ? "var(--bg-surface)" : "transparent",
        color: active ? "var(--fg-1)" : "var(--fg-3)",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
