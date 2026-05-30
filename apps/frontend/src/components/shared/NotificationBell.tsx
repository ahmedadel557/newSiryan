'use client';
import { useState, useRef, forwardRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Bell, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { Notification } from '@/types';
import type React from 'react';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead?: (id: string) => void;
  onDeleteOne?: (id: string) => void;
  onClearAll?: () => void;
  onNotificationClick?: (n: Notification) => void;
}

function timeAgo(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'Just now';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Just now';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SWIPE_THRESHOLD = 80;

interface SwipeableItemProps {
  notification: Notification;
  onDelete: (id: string) => void;
  onClick: () => void;
  children: React.ReactNode;
}

function SwipeableItem({ notification, onDelete, onClick, children }: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const hasDragged = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    hasDragged.current = false;
    setIsDragging(true);
    contentRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) hasDragged.current = true;
    setTranslateX(Math.min(0, delta));
  }

  function onPointerUp() {
    setIsDragging(false);
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-400);
      setTimeout(() => onDelete(notification.id), 180);
    } else {
      setTranslateX(0);
      if (!hasDragged.current) onClick();
    }
  }

  const revealWidth = Math.max(0, -translateX);

  return (
    <li className="relative overflow-hidden select-none">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{
          width: revealWidth,
          background: 'var(--critical)',
          transition: isDragging ? 'none' : 'width 0.18s ease',
        }}
      >
        {revealWidth > 20 && <Trash2 size={16} color="white" />}
      </div>
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.18s ease',
          touchAction: 'pan-y',
        }}
        className="bg-[var(--bg-surface)]"
      >
        {children}
      </div>
    </li>
  );
}

interface NotificationItemsProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onDeleteOne?: (id: string) => void;
  onNotificationClick?: (n: Notification) => void;
  onClose: () => void;
}

function NotificationItems({ notifications, onMarkRead, onDeleteOne, onNotificationClick, onClose }: NotificationItemsProps) {
  const recent = notifications.slice(0, 5);

  if (recent.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--fg-3)]">No notifications</p>;
  }

  return (
    <ul>
      {recent.map((n) => (
        <SwipeableItem
          key={n.id}
          notification={n}
          onDelete={(id) => onDeleteOne?.(id)}
          onClick={() => {
            onMarkRead?.(n.id);
            if (n.metadata?.userId || n.metadata?.action) onNotificationClick?.(n);
            onClose();
          }}
        >
          <div
            className={cn(
              'flex gap-3 px-4 py-3 border-b border-[var(--border-1)] last:border-b-0',
              (n.type === 'emergency' || n.type === 'lab' || n.type === 'radiology') && 'border-l-2',
              !n.is_read && n.type !== 'emergency' && n.type !== 'lab' && n.type !== 'radiology' && 'bg-[var(--brand-soft-bg)]',
              !n.is_read && n.type === 'emergency' && 'bg-[var(--critical-soft-bg)]',
              !n.is_read && (n.type === 'lab' || n.type === 'radiology') && 'bg-[var(--positive-soft-bg)]',
              (!!n.metadata?.userId || !!n.metadata?.action || !!n.metadata?.patient_id) && 'cursor-pointer hover:bg-[var(--sand-100)] dark:hover:bg-[var(--forest-900)] transition-colors'
            )}
            style={
              n.type === 'emergency'
                ? { borderLeftColor: 'var(--critical)' }
                : n.type === 'lab' || n.type === 'radiology'
                ? { borderLeftColor: 'var(--positive)' }
                : undefined
            }
          >
            <span
              className={cn('mt-1.5 h-[6px] w-[6px] shrink-0 rounded-full', !n.is_read ? 'opacity-100' : 'opacity-0')}
              style={{
                background:
                  n.type === 'emergency' ? 'var(--critical)'
                  : n.type === 'lab' || n.type === 'radiology' ? 'var(--positive)'
                  : 'var(--brand)',
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium truncate"
                style={{
                  color:
                    n.type === 'emergency' ? 'var(--critical-soft-fg)'
                    : n.type === 'lab' || n.type === 'radiology' ? 'var(--positive-soft-fg)'
                    : 'var(--fg-1)',
                }}
              >
                {n.title}
              </p>
              <p className="text-[12px] text-[var(--fg-3)] truncate mt-0.5">{n.message}</p>
              <p className="text-[11px] text-[var(--fg-4)] mt-1">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        </SwipeableItem>
      ))}
    </ul>
  );
}

const BellButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { unreadCount: number }
>(({ unreadCount, ...rest }, ref) => (
  <button
    ref={ref}
    {...rest}
    className=" relative inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--fg-2)] hover:bg-[var(--sand-100)] dark:hover:text-black transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    aria-label="Notifications"
  >
    <Bell size={18} strokeWidth={1.75} />
    {unreadCount > 0 && (
      <span className="absolute top-[-2px] right-[-2px] min-w-[18px] h-[18px] rounded-full bg-[var(--critical)] text-white text-[10px] font-semibold font-mono flex items-center justify-center px-1 leading-none">
        {unreadCount > 9 ? '9+' : String(unreadCount)}
      </span>
    )}
  </button>
));
BellButton.displayName = 'BellButton';

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onDeleteOne,
  onClearAll,
  onNotificationClick,
}: NotificationBellProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const recent = notifications.slice(0, 5);

  const headerActions = (
    <div className="flex items-center gap-3">
      {unreadCount > 0 && (
        <button onClick={onMarkAllRead} className="btn text-[12px] text-[var(--brand)] font-medium hover:opacity-80 transition-opacity">
          Mark all read
        </button>
      )}
      {recent.length > 0 && onClearAll && (
        <button
          onClick={() => {
            onClearAll();
            setOpen(false);
          }}
          className="btn text-[12px] text-[var(--fg-3)] hover:text-[var(--critical)] font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <BellButton unreadCount={unreadCount} onClick={() => setOpen(true)} />
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
            <div
              className="fixed bottom-16 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-[20px] flex flex-col overflow-hidden"
              style={{ maxHeight: 'calc(80vh - 64px)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)] shrink-0">
                <span className="text-[16px] font-semibold text-[var(--fg-1)]">Notifications</span>
                <div className="flex items-center gap-3">
                  {headerActions}
                  <button onClick={() => setOpen(false)} className="btn text-[var(--fg-3)] p-1" aria-label="Close">
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <NotificationItems
                  notifications={notifications}
                  onMarkRead={onMarkRead}
                  onDeleteOne={onDeleteOne}
                  onNotificationClick={onNotificationClick}
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BellButton unreadCount={unreadCount} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-50 focus:outline-none overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-1)]">
            <p className="text-[13px] font-semibold text-[var(--fg-1)]">Notifications</p>
            {headerActions}
          </div>
          <NotificationItems
            notifications={notifications}
            onMarkRead={onMarkRead}
            onDeleteOne={onDeleteOne}
            onNotificationClick={onNotificationClick}
            onClose={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
