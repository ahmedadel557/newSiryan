import Department from '../models/Department';
import Profile from '../models/Profile';

type SeedDepartment = { name: string; description?: string; assigned_roles: string[] };

// Canonical department list (clinical names match the values assigned in
// doctors.seed.ts). assigned_roles drives the role-based register form filter.
const SEED_DEPARTMENTS: SeedDepartment[] = [
  { name: 'Cardiology',       description: 'Heart and cardiovascular care',           assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Neurology',        description: 'Brain and nervous system care',           assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Dermatology',      description: 'Skin, hair and nail care',                assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Orthopedics',      description: 'Bones, joints and musculoskeletal care',  assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Pediatrics',       description: 'Medical care for infants and children',   assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'General Medicine', description: 'Primary and general healthcare',           assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Gynecology',       description: "Women's reproductive health",             assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  { name: 'Urology',          description: 'Urinary tract and male reproductive care', assigned_roles: ['doctor', 'nurse', 'receptionist'] },
  // Non-clinical departments — ensure every registerable staff role has a home.
  { name: 'Pharmacy',         description: 'Medication dispensing and stock',          assigned_roles: ['pharmacist'] },
  { name: 'Laboratory',       description: 'Clinical and diagnostic lab services',     assigned_roles: ['lab_technician'] },
  { name: 'Radiology',        description: 'Imaging and radiology services',           assigned_roles: ['radiology_technician'] },
  { name: 'Billing',          description: 'Cashier and patient billing',             assigned_roles: ['cashier', 'receptionist'] },
  { name: 'Administration',   description: 'Front desk and operations',                assigned_roles: ['receptionist', 'inventory_manager'] },
];

// Default roles for department names discovered on profiles but not in the
// canonical list — assume clinical so doctors/nurses can still be assigned.
const DEFAULT_ASSIGNED_ROLES = ['doctor', 'nurse'];

// Idempotent: upserts the canonical departments (backfilling assigned_roles and
// is_active onto rows that predate role-based departments) and also backfills any
// department name already assigned to a profile, so the admin filters, register
// form, and department pages always reflect the departments actually in use.
export const seedDepartments = async (): Promise<void> => {
  try {
    const canonicalByName = new Map<string, SeedDepartment>(
      SEED_DEPARTMENTS.map((d) => [d.name, d]),
    );

    const names = new Set<string>(canonicalByName.keys());
    const profileDepts = await Profile.distinct('department');
    for (const d of profileDepts) {
      if (typeof d === 'string' && d.trim().length > 0) names.add(d.trim());
    }

    let created = 0;
    for (const name of names) {
      const meta = canonicalByName.get(name);
      const roles = meta?.assigned_roles ?? DEFAULT_ASSIGNED_ROLES;

      // New rows get full canonical values; existing rows are left untouched here
      // so admin customisations to roles / is_active survive restarts.
      const result = await Department.updateOne(
        { name },
        { $setOnInsert: { name, description: meta?.description, assigned_roles: roles, is_active: true } },
        { upsert: true },
      );
      if (result.upsertedCount && result.upsertedCount > 0) created++;

      // Backfill only rows that predate role-based departments (missing/empty).
      await Department.updateOne(
        { name, $or: [{ assigned_roles: { $exists: false } }, { assigned_roles: { $size: 0 } }] },
        { $set: { assigned_roles: roles } },
      );
      await Department.updateOne(
        { name, is_active: { $exists: false } },
        { $set: { is_active: true } },
      );
    }

    console.log(created > 0 ? `✅ Seeded ${created} department(s)` : 'Departments already seeded');
  } catch (err) {
    console.error('Department seed error:', err);
  }
};
