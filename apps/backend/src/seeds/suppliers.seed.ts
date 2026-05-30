// import Supplier from '../models/Supplier';

// const mockSuppliers = [
//   {
//     name: 'MedLine Pharma',
//     contact_person: 'Dr. Hassan Ali',
//     phone: '+961 1 234 567',
//     email: 'orders@medline.lb',
//     category: 'medications',
//     address: 'Beirut, Lebanon',
//   },
//   {
//     name: 'HealthEquip Co.',
//     contact_person: 'Sara Mansour',
//     phone: '+961 3 456 789',
//     email: 'supply@healthequip.lb',
//     category: 'equipment',
//     address: 'Jounieh, Lebanon',
//   },
//   {
//     name: 'MedSupplies MENA',
//     contact_person: 'Ahmad Karimi',
//     phone: '+961 4 567 890',
//     email: 'mena@medsupplies.com',
//     category: 'supplies',
//     address: 'Tripoli, Lebanon',
//   },
//   {
//     name: 'PharmaDirect',
//     contact_person: 'Lara Khoury',
//     phone: '+961 1 789 012',
//     email: 'direct@pharmadirect.lb',
//     category: 'medications',
//     address: 'Sin El Fil, Lebanon',
//   },
//   {
//     name: 'Global Medical Solutions',
//     contact_person: 'Tariq Nasser',
//     phone: '+961 5 678 901',
//     email: 'info@gms-me.com',
//     category: 'all',
//     address: 'Hamra, Beirut',
//   },
// ];

// export async function seedSuppliers(): Promise<void> {
//   const count = await Supplier.countDocuments();
//   if (count === 0) {
//     await Supplier.insertMany(mockSuppliers);
//     console.log('Seeded 5 mock suppliers');
//   }
// }
