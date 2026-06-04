"use client";
import { useState, Fragment } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { User } from "@/types";
import type { UserRoleFilter } from "@/hooks/admin";
import { MoreVertical } from "lucide-react";

const thClass =
  "text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]";
const tdClass = "py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]";

const TABS: { id: UserRoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "patient", label: "Patients" },
  { id: "doctor", label: "Doctors" },
  { id: "nurse", label: "Nurses" },
  { id: "support", label: "Support" },
];

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  userFilter: UserRoleFilter;
  onFilterChange: (f: UserRoleFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEditRole?: (user: User) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

const FORTY_EIGHT_HOURS = 48 * 3600 * 1000;
function isNotActivated(user: User): boolean {
  return user.password_changed === false &&
    !!user.created_at &&
    Date.now() - new Date(user.created_at).getTime() > FORTY_EIGHT_HOURS;
}

export function UsersTable({
  users,
  isLoading,
  userFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onToggleActive,
  onEditRole,
  onDelete,
  currentUserId,
}: UsersTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cols = ["Name", "Email", "Role", "Status", "Actions"];

  return (
    <div className="card">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] flex-wrap">
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={[
                "btn px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors whitespace-nowrap",
                userFilter === tab.id
                  ? "bg-[var(--forest-900)] shadow-[var(--shadow-xs)] text-white"
                  : "text-[var(--fg-3)] hover:text-[var(--fg-1)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[160px] border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
        />
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {cols.map((h, i) => (
                  <th key={i} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {cols.map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div className="h-4 w-24 rounded bg-[var(--sand-100)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Users />} title="No users" description="No users match the current filter." />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={`${thClass} hidden md:table-cell`}>Email</th>
                <th className={`${thClass} hidden md:table-cell`}>Role</th>
                <th className={`${thClass} hidden md:table-cell`}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isExpanded = expandedRows.has(user.id);
                const isSelf = !!currentUserId && user.id === currentUserId;
                const notActivated = isNotActivated(user);
                return (
                  <Fragment key={user.id}>
                    <tr className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.username} size="sm" />
                          <div>
                            <p className="font-semibold text-[var(--fg-1)]">{user.username}</p>
                            <p className="text-[11px] text-[var(--fg-3)] font-mono">{user.id}</p>
                            {notActivated && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}
                              >
                                Not yet activated
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} text-[var(--fg-2)] hidden md:table-cell`}>{user.email}</td>
                      <td className={`${tdClass} hidden md:table-cell`}>
                        <Badge variant="info" dot>
                          {user.role.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className={`${tdClass} hidden md:table-cell`}>
                        <Badge variant={user.is_active ? "positive" : "caution"} dot>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Expand */}
                          <button
                            onClick={() => toggleRow(user.id)}
                            className="md:hidden rounded-md flex items-center justify-center p-2 "
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {/* Desktop actions */}
                          <div className="hidden md:flex items-center gap-1">
                            {onEditRole && (
                              <button
                                onClick={() => !isSelf && onEditRole(user)}
                                disabled={isSelf}
                                title={isSelf ? 'Cannot modify your own account' : undefined}
                                className="btn btn-ghost text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Edit role
                              </button>
                            )}

                            <button
                              onClick={() => !isSelf && onToggleActive(user.id, !user.is_active)}
                              disabled={isSelf && user.is_active}
                              title={isSelf && user.is_active ? 'Cannot deactivate your own account' : undefined}
                              className="btn btn-ghost text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>

                            {onDelete && (
                              <button
                                onClick={() => !isSelf && onDelete(user.id)}
                                disabled={isSelf}
                                title={isSelf ? 'Cannot delete your own account' : undefined}
                                className="btn outline text-red-500 hover:bg-red-500 hover:text-white transition-colors  text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          {/* Mobile menu */}
                          <div className="relative md:hidden">
                            <button
                              onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                              className="btn flex items-center justify-center p-2 "
                            >
                              <MoreVertical size={16} />
                            </button>

                            {openMenu === user.id && (
                              <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border bg-[var(--bg-surface)] shadow-lg p-1">
                                {onEditRole && (
                                  <button
                                    onClick={() => {
                                      if (!isSelf) onEditRole(user);
                                      setOpenMenu(null);
                                    }}
                                    disabled={isSelf}
                                    className="btn block w-full text-left p-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Edit role
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    if (!isSelf || !user.is_active) onToggleActive(user.id, !user.is_active);
                                    setOpenMenu(null);
                                  }}
                                  disabled={isSelf && user.is_active}
                                  title={isSelf && user.is_active ? 'Cannot deactivate your own account' : undefined}
                                  className="btn block w-full text-left p-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {user.is_active ? "Deactivate" : "Activate"}
                                </button>

                                {onDelete && (
                                  <button
                                    onClick={() => {
                                      if (!isSelf) onDelete(user.id);
                                      setOpenMenu(null);
                                    }}
                                    disabled={isSelf}
                                    className="btn block w-full text-left p-2 text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="md:hidden bg-[var(--sand-50)]">
                        <td colSpan={3} className="px-[14px] py-3 border-b border-[var(--border-1)]">
                          <dl className="flex flex-col gap-2 text-[13px]">
                            <div>
                              <dt className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
                                Email
                              </dt>
                              <dd className="text-[var(--fg-2)] mt-[2px]">{user.email}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
                                Status
                              </dt>
                              <dd className="mt-[2px]">
                                <Badge variant={user.is_active ? "positive" : "caution"} dot>
                                  {user.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
                                Role
                              </dt>
                              <dd className="text-[var(--fg-2)] mt-[2px]">{user.role}</dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
