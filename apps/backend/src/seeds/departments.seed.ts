import Department from '../models/Department';
import Profile from '../models/Profile';

// Canonical department list (names match the values assigned in doctors.seed.ts).
const SEED_DEPARTMENTS: { name: string; description?: string }[] = [
  { name: 'Cardiology',       description: 'Heart and cardiovascular care' },
  { name: 'Neurology',        description: 'Brain and nervous system care' },
  { name: 'Dermatology',      description: 'Skin, hair and nail care' },
  { name: 'Orthopedics',      description: 'Bones, joints and musculoskeletal care' },
  { name: 'Pediatrics',       description: 'Medical care for infants and children' },
  { name: 'General Medicine', description: 'Primary and general healthcare' },
  { name: 'Gynecology',       description: "Women's reproductive health" },
  { name: 'Urology',          description: 'Urinary tract and male reproductive care' },
];

// Idempotent: upserts the canonical departments and also backfills any
// department name already assigned to a profile, so the admin filters and
// department pages always reflect the departments actually in use.
export const seedDepartments = async (): Promise<void> => {
  try {
    const names = new Set<string>(SEED_DEPARTMENTS.map((d) => d.name));

    const profileDepts = await Profile.distinct('department');
    for (const d of profileDepts) {
      if (typeof d === 'string' && d.trim().length > 0) names.add(d.trim());
    }

    let created = 0;
    for (const name of names) {
      const meta = SEED_DEPARTMENTS.find((d) => d.name === name);
      const result = await Department.updateOne(
        { name },
        { $setOnInsert: { name, description: meta?.description } },
        { upsert: true },
      );
      if (result.upsertedCount && result.upsertedCount > 0) created++;
    }

    console.log(created > 0 ? `✅ Seeded ${created} department(s)` : 'Departments already seeded');
  } catch (err) {
    console.error('Department seed error:', err);
  }
};
