import { TriangleAlert } from 'lucide-react';

interface EscalationBannerProps {
  message: string;
}

export function EscalationBanner({ message }: EscalationBannerProps) {
  return (
    <div className="flex gap-[10px] items-start mx-4 my-2 p-[10px_12px] bg-[var(--coral-50)] text-[var(--coral-700)] border border-[var(--coral-200)] rounded-[var(--radius-md)]">
      <TriangleAlert size={16} className="shrink-0 mt-[2px]" />
      <div>
        <p className="font-semibold text-[12px]">Medical attention may be needed</p>
        <p className="text-[12px] mt-[2px]">{message}</p>
      </div>
    </div>
  );
}
