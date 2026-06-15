import User from '../models/User';
import Profile from '../models/Profile';

export const seedInventoryManager = async () => {
  try {
    const inventoryEmail = process.env.INVENTORY_MANAGER_EMAIL;
    if (!inventoryEmail) {
      console.error('❌ INVENTORY_MANAGER_EMAIL is not set — skipping inventory manager seed');
      return;
    }

    const exists = await User.findOne({ email: inventoryEmail });

    if (exists) {
      const needsRestore =
        !exists.isSystemAccount ||
        exists.role !== 'inventory_manager';

      await User.updateOne(
        { email: inventoryEmail },
        { $set: { isSystemAccount: true, role: 'inventory_manager' } },
      );

      if (needsRestore) {
        console.warn('[BOOTSTRAP_ACCOUNT] Inventory manager flags restored');
      } else {
        console.log('Inventory manager bootstrap account verified');
      }
      return;
    }

    const inventoryManager = await User.create({
      username: process.env.INVENTORY_MANAGER_USERNAME,
      email: inventoryEmail,
      password: process.env.INVENTORY_MANAGER_PASSWORD,
      role: 'inventory_manager',
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      is_profile_complete: true,
      password_changed: true,
      isSystemAccount: true,
    });

    await Profile.create({
      user: inventoryManager._id,
      first_name: 'System',
      last_name: 'Admin',
      department: 'Administration',
      specialization: 'Inventory Management',
    });

    console.log(`✅ Inventory Manager seeded: ${inventoryEmail}`);
  } catch (err) {
    console.error('Inventory Manager seed error:', err);
  }
};
