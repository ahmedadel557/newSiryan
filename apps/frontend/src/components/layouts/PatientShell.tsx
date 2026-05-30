'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, Search, Ambulance, Menu, MoreHorizontal, X, Settings } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { adminService } from '@/services/admin.service';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MaintenanceOverlay } from '@/components/shared/MaintenanceOverlay';
import { Avatar } from '@/components/ui/Avatar';
import { patientNav } from '@/config/navItems';
import type { NavItem } from '@/config/navItems';
import type { Notification } from '@/types';
import Image from 'next/image';

type MaintenancePayload = { message: string; estimated_duration?: number; enabled_at: string };


interface PatientShellProps {
  children: React.ReactNode;
  navItems?: NavItem[];
}

export function PatientShell({ children, navItems = patientNav }: PatientShellProps) {
  const { user, profile, logout } = useAuth();
  const [maintenanceState, setMaintenanceState] = useState<MaintenancePayload | null>(null);

  // On mount: check maintenance status via API (socket event may fire before listener registers)
  useEffect(() => {
    adminService.getPublicMaintenanceStatus().then((s) => {
      if (s.is_active) {
        setMaintenanceState({
          message: s.message ?? '',
          estimated_duration: s.estimated_duration,
          enabled_at: s.started_at ?? new Date().toISOString(),
        });
      }
    }).catch(() => {});
  }, []);

  useSocketEvent<MaintenancePayload>(
    'system_maintenance',
    useCallback((p) => setMaintenanceState(p), [])
  );
  useSocketEvent<{ message: string }>(
    'system_online',
    useCallback(() => setMaintenanceState(null), [])
  );
  const avatarName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user?.username || user?.email || '?';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';
  const avatarSrc = profile?.avatar_url
    ? profile.avatar_url.startsWith('/uploads/')
      ? `${SOCKET_URL}${profile.avatar_url}`
      : profile.avatar_url
    : undefined;
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ''}`.trim() : user?.username || user?.email || 'User';
  const { notifications, unreadCount, markRead, markAllRead, deleteOne, clearAll } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();

  function handleNotificationClick(n: Notification) {
    if (n.metadata?.action === 'rate' && n.metadata?.appointment_id) {
      sessionStorage.setItem('rate_appointment_id', n.metadata.appointment_id as string);
      router.push('/dashboard/patient/appointments');
    }
  }
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (isTablet) setCollapsed(true);
    else if (!isMobile) setCollapsed(false);
  }, [isTablet, isMobile]);

  // Close drawer when navigating
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    const isRootRoute = href.split('/').length <= 3;
    if (isRootRoute) return pathname === href;
    return pathname.startsWith(href);
  };

  const bottomNavItems = navItems.slice(0, 4);
  const drawerNavItems = navItems.slice(4);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      {!isMobile && (
        <aside
          className={cn(
            'shrink-0 flex flex-col h-screen sticky top-0 bg-[var(--bg-surface)] border-r border-[var(--border-1)] overflow-y-auto transition-all duration-[220ms]',
            collapsed ? 'w-16' : 'w-[248px]'
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border-1)]">
            <Image src="/assets/siryan-logo.png" alt="Siryan" width={34} height={34} className="w-8 h-8 shrink-0 object-contain" />
            {!collapsed && (
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Siryan</p>
              </div>
            )}
          </div>
          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-[2px] py-4 px-3">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-[8px] text-[13.5px] transition-colors',
                    collapsed && 'justify-center',
                    active
                      ? 'px-[10px] py-[10px] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] font-medium border-l-2 border-[var(--brand)]'
                      : 'px-3 py-[10px] text-[var(--fg-2)] hover:bg-[rgba(255,255,255,0.18)] hover:text-[var(--fg-1)]'
                  )}
                >
                  <span className={cn('shrink-0', active ? 'text-[var(--brand)]' : 'text-[var(--fg-3)]')}>{item.icon}</span>
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.08)] mx-2 my-5" />

          {/* Footer */}
          <div className="px-3 pb-4 flex flex-col gap-3 mt-auto">
            {/* Emergency card */}
            <div
              className={cn('rounded-[var(--radius-md)] bg-[var(--coral-50)] border border-[var(--coral-200)] p-3 flex gap-3', collapsed && 'hidden')}
            >
              <Ambulance size={18} strokeWidth={1.75} className="text-[var(--coral-400)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-black">Emergency?</p>
                <p className="text-[12px] text-[var(--coral-500)] mt-0.5 leading-snug">Call 112 or visit the ER directly.</p>
              </div>
            </div>

            {/* User row */}
            <div
              onClick={logout}
              className="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[rgba(255,255,255,0.18)] transition-colors cursor-pointer"
            >
              <div className={collapsed ? 'hidden' : 'flex items-center justify-between gap-4 w-full'}>
                <Avatar name={avatarName} src={avatarSrc} size="sm" />
                <p className="text-[13px] font-medium text-[var(--fg-1)] truncate flex-1">{displayName}</p>
              </div>
              <button title="Log out" className="p-1.5 rounded text-[var(--fg-3)] transition-colors cursor-none">
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        {isMobile ? (
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-1)] shadow-sm flex items-center justify-between px-4">
            <Image src="/assets/siryan-logo.png" alt="Siryan" width={28} height={28} className="w-7 h-7 object-contain" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onDeleteOne={deleteOne}
                onClearAll={clearAll}
                onNotificationClick={handleNotificationClick}
              />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1">
                    <Avatar name={avatarName} src={avatarSrc} size="sm" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 min-w-[160px] rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-1)] shadow-lg py-1"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/dashboard/patient/settings"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--fg-1)] hover:bg-[var(--sand-100)] cursor-pointer outline-none"
                      >
                        <Settings size={14} strokeWidth={1.75} /> Settings
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-[var(--border-1)] my-1" />
                    <DropdownMenu.Item
                      onSelect={logout}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--critical)] hover:bg-[var(--critical-soft-bg)] cursor-pointer outline-none"
                    >
                      <LogOut size={14} strokeWidth={1.75} /> Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>
        ) : (
          /* Desktop / tablet topbar */
          <header className="h-[72px] shrink-0 sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-1)] flex items-center gap-4 px-6">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--fg-2)] hover:bg-[var(--sand-100)] transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={17} strokeWidth={1.75} />
            </button>
            {/* Search */}
            <div className="flex-1 max-w-[480px] relative">
              <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <input
                type="search"
                placeholder="Search…"
                className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-black placeholder:text-gray-500 border-0 outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-0 transition-shadow"
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onDeleteOne={deleteOne}
                onClearAll={clearAll}
                onNotificationClick={handleNotificationClick}
              />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1">
                    <Avatar name={avatarName} src={avatarSrc} size="sm" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 min-w-[160px] rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-1)] shadow-lg py-1"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/dashboard/patient/settings"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--fg-1)] hover:bg-[var(--sand-100)] cursor-pointer outline-none"
                      >
                        <Settings size={14} strokeWidth={1.75} /> Settings
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-[var(--border-1)] my-1" />
                    <DropdownMenu.Item
                      onSelect={logout}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--critical)] hover:bg-[var(--critical-soft-bg)] cursor-pointer outline-none"
                    >
                      <LogOut size={14} strokeWidth={1.75} /> Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className={cn('max-w-[1280px]', isMobile ? 'px-4 py-4 pb-[80px]' : 'px-8 py-7')}>{children}</div>
        </main>
      </div>

      {/* Full-screen maintenance overlay for patients.
          Guard on `user` so it doesn't flash during logout when `user` briefly becomes null. */}
      {maintenanceState && user && (
        <MaintenanceOverlay
          message={maintenanceState.message}
          estimatedDuration={maintenanceState.estimated_duration}
          startedAt={maintenanceState.enabled_at}
          isAdmin={false}
          onAdminDismiss={() => {}}
          onLogout={logout}
        />
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-1)] shadow-[0_-2px_8px_rgba(0,0,0,0.08)] flex items-stretch">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform',
                  active ? 'text-[var(--brand)]' : 'text-[var(--fg-3)]'
                )}
              >
                <span className="relative flex items-center justify-center w-9 h-7">
                  {active && <span className="absolute inset-0 rounded-full bg-[var(--brand-soft-bg)]" />}
                  <span className="relative [&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                </span>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
          {drawerNavItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[var(--fg-3)] active:scale-90 transition-transform"
            >
              <MoreHorizontal size={20} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          )}
        </nav>
      )}

      {/* Slide-up drawer */}
      {isMobile && drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-[20px] max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (e.changedTouches[0].clientX - touchStartX.current < -60) setDrawerOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)]">
              <span className="text-[15px] font-semibold text-[var(--fg-1)]">More</span>
              <button onClick={() => setDrawerOpen(false)} className="text-[var(--fg-3)] p-1">
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col py-2">
              {drawerNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3 text-[14px]',
                    isActive(item.href) ? 'text-[var(--brand)] font-medium' : 'text-[var(--fg-1)]'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
