'use client';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function ModalSheet({ open, onOpenChange, children, className = '', maxWidth = 'md:w-[520px]' }: ModalSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className={[
            'fixed z-50 bg-[var(--bg-surface)] flex flex-col overflow-hidden shadow-[var(--shadow-lg)]',
            // Mobile: slide up from bottom
            'inset-x-0 bottom-0 max-h-[90vh] rounded-t-[20px]',
            // Desktop: centered dialog
            'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
            'md:rounded-[var(--radius-lg)] md:max-h-[85vh]',
            maxWidth,
            className,
          ].join(' ')}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
