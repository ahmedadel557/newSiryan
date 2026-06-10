"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import type { User, Department, Role } from "@/types";
import { useToast } from "@/hooks/shared";
import { ArrowLeft, ChevronDown } from "lucide-react";

const ROLE_LABELS: Partial<Record<Role, string>> = {
  doctor: "Doctors",
  nurse: "Nurses",
  pharmacist: "Pharmacists",
  receptionist: "Receptionists",
  lab_technician: "Lab Technicians",
  radiology_technician: "Radiology Technicians",
  cashier: "Cashiers",
  inventory_manager: "Inventory Managers",
};

export default function DepartmentStaffPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [staff, setStaff] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffList, depts] = await Promise.all([
        adminService.getDepartmentStaff(id),
        adminService.getDepartments(),
      ]);
      setStaff(staffList);
      setDepartments(depts);
      setDepartment(depts.find((d) => d.id === id) ?? null);
    } catch {
      showToast("Failed to load department staff", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReassign = async (staffId: string, newDeptId: string) => {
    setReassigning(staffId);
    try {
      await adminService.assignStaffDepartment(staffId, newDeptId);
      showToast("Staff reassigned");
      load();
    } catch {
      showToast("Failed to reassign staff", "error");
    } finally {
      setReassigning(null);
    }
  };

  // Group by role
  const grouped = staff.reduce<Partial<Record<Role, User[]>>>((acc, u) => {
    const role = u.role as Role;
    if (!acc[role]) acc[role] = [];
    acc[role]!.push(u);
    return acc;
  }, {});

  const otherDepts = departments.filter((d) => d.id !== id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/departments" className="btn btn-ghost btn-sm">
          <ArrowLeft className="rtl:rotate-180" size={16} />
        </Link>
        <div>
          <h1 className="t-h2">{department?.name ?? "Department"}</h1>
          {department?.description && (
            <p className="t-body" style={{ color: "var(--fg-2)" }}>
              {department.description}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center" style={{ color: "var(--fg-3)" }}>
          Loading staff...
        </div>
      ) : staff.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--fg-3)" }}>
          No staff assigned to this department
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => {
            const members = grouped[role];
            if (!members || members.length === 0) return null;
            return (
              <section key={role} className="space-y-3">
                <h2 className="t-h3">
                  {ROLE_LABELS[role]}{" "}
                  <span className="t-small" style={{ color: "var(--fg-3)" }}>
                    ({members.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((u) => (
                    <div key={u.id} className="card p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="t-body font-medium">{u.email}</p>
                        <p className="t-small capitalize" style={{ color: "var(--fg-3)" }}>
                          {role.replace("_", " ")}
                        </p>
                      </div>
                      {otherDepts.length > 0 && (
                        <div style={{ position: "relative" }}>
                          <select
                            className="input"
                            style={{ fontSize: 12, paddingRight: 24, minWidth: 130 }}
                            defaultValue=""
                            disabled={reassigning === u.id}
                            onChange={(e) => {
                              if (e.target.value) handleReassign(u.id, e.target.value);
                              e.target.value = "";
                            }}
                          >
                            <option value="" disabled>
                              Reassign dept…
                            </option>
                            {otherDepts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            style={{
                              position: "absolute",
                              right: 6,
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                              color: "var(--fg-3)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
