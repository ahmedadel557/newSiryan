import dotenvFlow from 'dotenv-flow';
import path from 'path';

dotenvFlow.config({
  path: path.resolve(__dirname, '..'),
  default_node_env: 'development',
});

import mongoose from 'mongoose';
import User, { Role } from '../src/models/User';
import Profile from '../src/models/Profile';
import Department from '../src/models/Department';

const TEST_PASSWORD = 'Test@12345';

interface TestAccount {
  role: Role;
  email: string;
  username: string;
  lastNameLabel: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { role: 'patient',              email: 'test.patient@siryan.xyz',      username: 'test_patient',              lastNameLabel: 'Patient' },
  { role: 'doctor',               email: 'test.doctor@siryan.xyz',       username: 'test_doctor',               lastNameLabel: 'Doctor' },
  { role: 'nurse',                email: 'test.nurse@siryan.xyz',        username: 'test_nurse',                lastNameLabel: 'Nurse' },
  { role: 'receptionist',         email: 'test.receptionist@siryan.xyz', username: 'test_receptionist',         lastNameLabel: 'Receptionist' },
  { role: 'pharmacist',           email: 'test.pharmacist@siryan.xyz',   username: 'test_pharmacist',           lastNameLabel: 'Pharmacist' },
  { role: 'inventory_manager',    email: 'test.inventory@siryan.xyz',    username: 'test_inventory_manager',    lastNameLabel: 'Inventory Manager' },
  { role: 'lab_technician',       email: 'test.lab@siryan.xyz',          username: 'test_lab_technician',       lastNameLabel: 'Lab Technician' },
  { role: 'radiology_technician', email: 'test.radiology@siryan.xyz',    username: 'test_radiology_technician', lastNameLabel: 'Radiology Technician' },
  { role: 'cashier',              email: 'test.cashier@siryan.xyz',      username: 'test_cashier',              lastNameLabel: 'Cashier' },
  { role: 'admin',                email: 'test.admin@siryan.xyz',        username: 'test_admin',                lastNameLabel: 'Admin' },
];

interface ResultRow {
  role: string;
  email: string;
  status: string;
}

async function findDepartmentName(role: Role): Promise<string> {
  if (role === 'patient') return '';
  const dept = await Department.findOne({ is_active: true, assigned_roles: role });
  return dept?.name ?? 'General';
}

async function seedAccount(account: TestAccount): Promise<ResultRow> {
  const { role, email, username, lastNameLabel } = account;

  const existing = await User.findOne({ email });
  if (existing) {
    return { role, email, status: 'skipped (already exists)' };
  }

  const departmentName = await findDepartmentName(role);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const created = await User.create(
        [
          {
            username,
            email,
            password: TEST_PASSWORD,
            role,
            is_active: true,
            is_approved: true,
            approval_status: 'approved',
            password_changed: true,
            is_email_verified: true,
            is_profile_complete: true,
            is_test_account: true,
          },
        ],
        { session },
      );

      const user = created[0];

      const profileDoc: Record<string, unknown> = {
        user: user._id,
        first_name: 'Test',
        last_name: lastNameLabel,
        phone: '',
        national_id: '',
      };

      if (departmentName) {
        profileDoc.department = departmentName;
      }

      await Profile.create([profileDoc], { session });
    });

    return { role, email, status: 'created' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { role, email, status: `failed: ${msg}` };
  } finally {
    await session.endSession();
  }
}

// ─── Table renderer ────────────────────────────────────────────────────────────

const C1 = 30; // Role column inner width (including surrounding spaces)
const C2 = 37; // Email column inner width
const C3 = 13; // Password column inner width
const C4 = 30; // Status column inner width

function pad(str: string, width: number): string {
  return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
}

function printTable(rows: ResultRow[]): void {
  const h = (n: number) => '═'.repeat(n);
  const top    = `╔${h(C1)}╦${h(C2)}╦${h(C3)}╦${h(C4)}╗`;
  const sep    = `╠${h(C1)}╬${h(C2)}╬${h(C3)}╬${h(C4)}╣`;
  const bottom = `╚${h(C1)}╩${h(C2)}╩${h(C3)}╩${h(C4)}╝`;
  const row = (a: string, b: string, c: string, d: string) =>
    `║ ${pad(a, C1 - 2)} ║ ${pad(b, C2 - 2)} ║ ${pad(c, C3 - 2)} ║ ${pad(d, C4 - 2)} ║`;

  console.log('\n' + top);
  console.log(row('Role', 'Email', 'Password', 'Status'));
  console.log(sep);
  for (const r of rows) {
    console.log(row(r.role, r.email, TEST_PASSWORD, r.status));
  }
  console.log(bottom + '\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌  MONGO_URI is not set. Check apps/backend/.env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(mongoUri);
  console.log('✔  MongoDB connected\n');

  const results: ResultRow[] = [];

  for (const account of TEST_ACCOUNTS) {
    const result = await seedAccount(account);
    results.push(result);
    const icon =
      result.status === 'created'
        ? '✅'
        : result.status.startsWith('failed')
          ? '❌'
          : '⏭ ';
    console.log(`${icon}  ${result.role.padEnd(22)} ${result.status}`);
  }

  printTable(results);
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    mongoose.disconnect().catch(console.error);
  });
