import User from '../models/User';
import Profile from '../models/Profile';

export const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('❌ ADMIN_EMAIL is not set — skipping admin seed');
      return;
    }

    const exists = await User.findOne({ email: adminEmail });

    if (exists) {
      const needsRestore =
        !exists.isRootAdmin ||
        !exists.isSystemAccount ||
        exists.role !== 'admin';

      await User.updateOne(
        { email: adminEmail },
        { $set: { isRootAdmin: true, isSystemAccount: true, role: 'admin' } },
      );

      if (needsRestore) {
        console.warn('[BOOTSTRAP_ACCOUNT] Root admin flags restored');
      } else {
        console.log('Admin bootstrap account verified');
      }
      return;
    }

    const admin = await User.create({
      username: process.env.ADMIN_USERNAME,
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      is_profile_complete: true,
      password_changed: true,
      isRootAdmin: true,
      isSystemAccount: true,
    });

    await Profile.create({
      user: admin._id,
      first_name: 'System',
      last_name: 'Admins',
      department: 'Administration',
    });

    console.log(`✅ Admin seeded: ${adminEmail}`);
  } catch (err) {
    console.error('Admin seed error:', err);
  }
};
