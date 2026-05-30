'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, LogOut, MoreHorizontal, X, Settings } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useToast } from '@/hooks/useToast';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MaintenanceOverlay } from '@/components/shared/MaintenanceOverlay';
import { Avatar } from '@/components/ui/Avatar';
import { adminService } from '@/services/admin.service';
import type { NavItem } from '@/config/navItems';
import type { Role } from '@/types';
import Image from 'next/image';

type MaintenancePayload = { message: string; estimated_duration?: number; enabled_at: string };

type AnnouncementPayload = { id: string; title: string; message: string; priority: string };

const roleLabel: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  inventory_manager: 'Inventory',
  lab_technician: 'Lab Tech',
  radiology_technician: 'Radiology',
  cashier: 'Cashier',
  admin: 'Admin',
};

interface StaffShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  pageTitle?: string;
}

export function StaffShell({ children, navItems, pageTitle }: StaffShellProps) {
  const { user, profile, logout } = useAuth();
  const { showToast } = useToast();
  const [pendingStaffCount, setPendingStaffCount] = useState(0);
  const [maintenanceState, setMaintenanceState] = useState<MaintenancePayload | null>(null);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState<AnnouncementPayload[]>([]);

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
  useSocketEvent<AnnouncementPayload>(
    'announcement:new',
    useCallback((p) => {
      if (p.priority === 'urgent') {
        setUrgentAnnouncements((prev) => [p, ...prev]);
      }
    }, [])
  );
  useSocketEvent<{ shift?: string }>(
    'schedule:updated',
    useCallback(() => {
      if (user?.role === 'doctor') {
        showToast('Your schedule has been updated by an administrator.', 'info');
      }
    }, [user?.role, showToast])
  );
  const avatarName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user?.username || '?';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';
  const avatarSrc = profile?.avatar_url
    ? profile.avatar_url.startsWith('/uploads/')
      ? `${SOCKET_URL}${profile.avatar_url}`
      : profile.avatar_url
    : undefined;
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ''}`.trim() : user?.username || 'Staff';
  const { notifications, unreadCount, markRead, markAllRead, deleteOne, clearAll } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();
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

  useEffect(() => {
    if (user?.role === 'admin') {
      adminService.getStaffRequests('pending').then((d) => setPendingStaffCount(d.total)).catch(() => {});
    }
  }, [user?.role]);

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
            'shrink-0 flex flex-col h-screen sticky top-0 bg-[var(--forest-900)] overflow-hidden transition-all duration-[220ms]',
            collapsed ? 'w-16' : 'w-[248px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-[10px] px-3 pt-4 pb-5">
            <Image src="/assets/siryan-logo.png" alt="Siryan" width={34} height={34} className="w-[34px] h-[34px] shrink-0 object-contain" />
            {!collapsed && (
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.02em] text-white">Siryan</p>
                <p className="text-[11px] text-[rgba(255,255,255,0.55)]"> Staff Dashboard</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="scrollbar-light flex-1 flex flex-col gap-[2px] px-2 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-[10px] py-[9px] rounded-[8px] text-[13.5px] transition-colors',
                    collapsed && 'justify-center',
                    active
                      ? 'bg-[rgba(255,255,255,0.10)] text-white font-medium border-l-2 border-white'
                      : 'text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.18)] hover:text-white border-l-2 border-transparent'
                  )}
                >
                  <span className={cn('shrink-0', active ? 'text-white' : 'text-[rgba(255,255,255,0.65)]')}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={cn('shrink-0', active ? 'text-white' : 'text-[rgba(255,255,255,0.65)]')}>{item.label}</span>
                      {item.href === '/dashboard/admin/staff-requests' && pendingStaffCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[var(--critical)] text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                          {pendingStaffCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-px bg-[rgba(255,255,255,0.08)] mx-2 my-2" />

          {/* Footer */}
          <div className="flex flex-col gap-1 px-2 pb-4">
            {!collapsed && user && (
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.8)] text-[10px] font-medium px-2 py-0.5 uppercase tracking-wide shrink-0">
                  {roleLabel[user.role]}
                </span>
                <span className="text-[12px] text-[rgba(255,255,255,0.7)] truncate">{displayName}</span>
              </div>
            )}
            <button
              onClick={logout}
              title={collapsed ? 'Log out' : undefined}
              className={cn(
                'flex items-center gap-3 px-[10px] py-[8px] rounded-[8px] text-[13px] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition-colors w-full text-left',
                collapsed && 'justify-center'
              )}
            >
              <LogOut size={14} className="shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>Log out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 bg-[var(--bg-page)]">
        {/* Maintenance banner for admin (non-admin gets full-screen overlay below) */}
        {maintenanceState && user?.role === 'admin' && (
          <MaintenanceOverlay
            message={maintenanceState.message}
            estimatedDuration={maintenanceState.estimated_duration}
            startedAt={maintenanceState.enabled_at}
            isAdmin={true}
            onAdminDismiss={() => setMaintenanceState(null)}
          />
        )}

        {/* Mobile topbar */}
        {isMobile ? (
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-1)] shadow-sm flex items-center px-4 gap-3">
            <Image src="/assets/siryan-logo.png" alt="Siryan" width={28} height={28} className="w-7 h-7 object-contain shrink-0" />
            <h1 className="flex-1 text-[15px] font-semibold text-[var(--fg-1)] truncate">{pageTitle ?? ''}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onDeleteOne={deleteOne}
                onClearAll={clearAll}
                onNotificationClick={(n) => {
                  if ((n.metadata as any)?.type === 'staff_approval') {
                    router.push('/dashboard/admin/staff-requests');
                  } else if (n.metadata?.userId) {
                    router.push(`/dashboard/admin/users/${n.metadata.userId as string}`);
                  } else if (user?.role === 'doctor' && (n.type === 'lab' || n.type === 'radiology') && n.metadata?.patient_id) {
                    router.push(`/dashboard/doctor/patients/${n.metadata.patient_id as string}`);
                  }
                }}
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
                        href="/dashboard/settings"
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
          <header className="h-16 shrink-0 sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-1)] flex items-center px-6">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--fg-2)] hover:bg-[var(--sand-100)] transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={17} strokeWidth={1.75} />
            </button>

            {pageTitle && <h1 className="ml-4 text-[17px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">{pageTitle}</h1>}

            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onDeleteOne={deleteOne}
                onClearAll={clearAll}
                onNotificationClick={(n) => {
                  if ((n.metadata as any)?.type === 'staff_approval') {
                    router.push('/dashboard/admin/staff-requests');
                  } else if (n.metadata?.userId) {
                    router.push(`/dashboard/admin/users/${n.metadata.userId as string}`);
                  } else if (user?.role === 'doctor' && (n.type === 'lab' || n.type === 'radiology') && n.metadata?.patient_id) {
                    router.push(`/dashboard/doctor/patients/${n.metadata.patient_id as string}`);
                  }
                }}
              />

              <div className="flex items-center gap-[10px] pl-4 border-l border-[var(--border-1)] ml-2">
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
                {user && (
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--fg-1)] leading-none">{displayName}</p>
                    <p className="text-[11px] text-[var(--fg-3)] font-mono mt-0.5">{user.role.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Urgent announcement banners */}
        {urgentAnnouncements.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-4 px-6 py-2.5 border-b"
            style={{ background: 'var(--critical-soft-bg)', borderColor: 'var(--critical)' }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span
                className="badge text-[10px] font-bold uppercase tracking-wide shrink-0"
                style={{ background: 'var(--critical)', color: '#fff' }}
              >
                Urgent
              </span>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--critical)' }}>{a.title}</span>
              <span className="text-[13px]" style={{ color: 'var(--fg-2)' }}>{a.message}</span>
            </div>
            <button
              onClick={() => setUrgentAnnouncements((prev) => prev.filter((x) => x.id !== a.id))}
              className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              style={{ color: 'var(--fg-3)' }}
              aria-label="Dismiss announcement"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className={cn('p-7', isMobile && 'px-4 pt-4 pb-[80px]')}>{children}</div>
        </main>
      </div>

      {/* Full-screen maintenance overlay for non-admin staff.
          Guard on `user` so it doesn't flash during logout when `user` briefly becomes null. */}
      {maintenanceState && user && user.role !== 'admin' && (
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
        <nav className="fixed bottom-0 left-0 right-0 h-16 z-30 bg-[var(--forest-800)] border-t border-[rgba(255,255,255,0.1)] flex items-stretch">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform',
                  active ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'
                )}
              >
                <span className="relative flex items-center justify-center w-9 h-7">
                  {active && <span className="absolute inset-0 rounded-full bg-[rgba(255,255,255,0.15)]" />}
                  <span className="relative [&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                </span>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
          {drawerNavItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[rgba(255,255,255,0.5)] active:scale-90 transition-transform"
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--forest-800)] rounded-t-[20px] max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (e.changedTouches[0].clientX - touchStartX.current < -60) setDrawerOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-[15px] font-semibold text-white">More</span>
              <button onClick={() => setDrawerOpen(false)} className="text-[rgba(255,255,255,0.6)] p-1">
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
                    isActive(item.href) ? 'text-white font-medium' : 'text-[rgba(255,255,255,0.7)]'
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
