import User from '../models/User';
import Profile from '../models/Profile';

export const seedAdmin = async () => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) {
      console.log('Admin already exists:', exists.email);
      return;
    }

    const admin = await User.create({
      username: process.env.ADMIN_USERNAME ,
      email: process.env.ADMIN_EMAIL ,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      is_profile_complete: true,
      password_changed: true,
    });

    await Profile.create({
      user: admin._id,
      first_name: 'System',
      last_name: 'Admin',
      department: 'Administration',
    });

    console.log(`✅ Admin seeded: ${process.env.ADMIN_EMAIL}`);
  } catch (err) {
    console.error('Admin seed error:', err);
  }
};