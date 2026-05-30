import User from '../models/User';
import Profile from '../models/Profile';

const SEED_DOCTORS = [
  { first_name: 'Sarah',   last_name: 'Hassan',  email: 'dr.sarah@siryan.com',   username: 'sarah_hassan',   specialization: 'Cardiologist',         department: 'Cardiology',      shift: 'morning' as const },
  { first_name: 'Mohamed', last_name: 'Ali',      email: 'dr.mohamed@siryan.com', username: 'mohamed_ali',    specialization: 'Neurologist',           department: 'Neurology',       shift: 'morning' as const },
  { first_name: 'Layla',   last_name: 'Karam',    email: 'dr.layla@siryan.com',   username: 'layla_karam',    specialization: 'Dermatologist',         department: 'Dermatology',     shift: 'evening' as const },
  { first_name: 'Omar',    last_name: 'Nasser',   email: 'dr.omar@siryan.com',    username: 'omar_nasser',    specialization: 'Orthopedist',           department: 'Orthopedics',     shift: 'morning' as const },
  { first_name: 'Nadia',   last_name: 'Mansour',  email: 'dr.nadia@siryan.com',   username: 'nadia_mansour',  specialization: 'Pediatrician',          department: 'Pediatrics',      shift: 'morning' as const },
  { first_name: 'Karim',   last_name: 'Saleh',    email: 'dr.karim@siryan.com',   username: 'karim_saleh',    specialization: 'General Practitioner',  department: 'General Medicine',shift: 'morning' as const },
  { first_name: 'Rania',   last_name: 'Farouk',   email: 'dr.rania@siryan.com',   username: 'rania_farouk',   specialization: 'Gynecologist',          department: 'Gynecology',      shift: 'morning' as const },
  { first_name: 'Tarek',   last_name: 'Ibrahim',  email: 'dr.tarek@siryan.com',   username: 'tarek_ibrahim',  specialization: 'Urologist',             department: 'Urology',         shift: 'evening' as const },
];

export const seedDoctors = async (): Promise<void> => {
  try {
    const existing = await User.countDocuments({ role: 'doctor' });
    if (existing >= SEED_DOCTORS.length) {
      console.log('Doctors already seeded');
      return;
    }

    for (const doc of SEED_DOCTORS) {
      const exists = await User.findOne({ email: doc.email });
      if (exists) continue;

      const user = await User.create({
        username: doc.username,
        email: doc.email,
        password: 'Doctor@123',
        role: 'doctor',
        is_active: true,
        is_approved: true,
        approval_status: 'approved',
        is_profile_complete: true,
        password_changed: true,
      });

      await Profile.create({
        user: user._id,
        first_name: doc.first_name,
        last_name: doc.last_name,
        specialization: doc.specialization,
        department: doc.department,
        shift: doc.shift,
        phone: '',
      });

      console.log(`Seeded doctor: Dr. ${doc.first_name} ${doc.last_name}`);
    }

    console.log('✅ Doctors seeded successfully');
  } catch (err) {
    console.error('Doctor seed error:', err);
  }
};
