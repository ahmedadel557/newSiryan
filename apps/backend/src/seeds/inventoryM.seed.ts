import User from '../models/User';
import Profile from '../models/Profile';

export const seedInventoryManager = async () => {
  try {
    const exists = await User.findOne({ role: 'inventory_manager' });
    if (exists) {
      console.log('Inventory Manager already exists:', exists.email);
      return;
    }

    const inventoryManager = await User.create({
      username: process.env.INVENTORY_MANAGER_USERNAME ,
      email: process.env.INVENTORY_MANAGER_EMAIL ,
      password: process.env.INVENTORY_MANAGER_PASSWORD,
      role: 'inventory_manager',
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      is_profile_complete: true,
      password_changed: true,
    });

    await Profile.create({
      user: inventoryManager._id,
      first_name: 'System',
      last_name: 'Admin',
      department: 'Administration',
      specialization: 'Inventory Management',
    });

    console.log(`✅ Inventory Manager seeded: ${process.env.INVENTORY_MANAGER_EMAIL}`);
  } catch (err) {
    console.error('Inventory Manager seed error:', err);
  }
};