'use client';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

export default function AssistantPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-5 text-center max-w-[360px]">
        <div className="w-16 h-16 rounded-[18px] bg-[var(--brand-soft-bg)] flex items-center justify-center">
          <Image
            src="/assets/siryan-logo.png"
            alt="Siryan"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">
            Siryan Assistant is coming soon
          </h1>
          <p className="text-[14px] text-[var(--fg-3)] leading-relaxed">
            Your AI-powered medical assistant will be available here soon. It will help you understand your health, review your records, and answer medical questions.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] text-[13px] font-medium">
          <Sparkles size={14} />
          <span>Powered by Siryan AI</span>
        </div>
      </div>
    </div>
  );
}
