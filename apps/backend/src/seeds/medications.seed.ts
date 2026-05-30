import Medication from '../models/Medication';

const SEED_MEDICATIONS = [
  { name: 'Paracetamol 500mg',    category: 'Analgesic',          unit: 'tablets',  requires_prescription: false, price: 15000, stock_quantity: 500, low_stock_threshold: 50 },
  { name: 'Amoxicillin 250mg',    category: 'Antibiotic',         unit: 'capsules', requires_prescription: true,  price: 45000, stock_quantity: 200, low_stock_threshold: 30 },
  { name: 'Omeprazole 20mg',      category: 'Antacid',            unit: 'capsules', requires_prescription: false, price: 25000, stock_quantity: 300, low_stock_threshold: 40 },
  { name: 'Metformin 500mg',      category: 'Antidiabetic',       unit: 'tablets',  requires_prescription: true,  price: 20000, stock_quantity: 150, low_stock_threshold: 25 },
  { name: 'Cetirizine 10mg',      category: 'Antihistamine',      unit: 'tablets',  requires_prescription: false, price: 18000, stock_quantity: 400, low_stock_threshold: 50 },
  { name: 'Ibuprofen 400mg',      category: 'Anti-inflammatory',  unit: 'tablets',  requires_prescription: false, price: 22000, stock_quantity: 250, low_stock_threshold: 40 },
  { name: 'Atorvastatin 10mg',    category: 'Statin',             unit: 'tablets',  requires_prescription: true,  price: 55000, stock_quantity: 100, low_stock_threshold: 20 },
  { name: 'Salbutamol Inhaler',   category: 'Bronchodilator',     unit: 'inhaler',  requires_prescription: true,  price: 85000, stock_quantity:  80, low_stock_threshold: 15 },
  { name: 'Metronidazole 250mg',  category: 'Antibiotic',         unit: 'tablets',  requires_prescription: true,  price: 30000, stock_quantity: 180, low_stock_threshold: 30 },
  { name: 'Loratadine 10mg',      category: 'Antihistamine',      unit: 'tablets',  requires_prescription: false, price: 16000, stock_quantity: 350, low_stock_threshold: 50 },
  { name: 'Amlodipine 5mg',       category: 'Antihypertensive',   unit: 'tablets',  requires_prescription: true,  price: 35000, stock_quantity: 120, low_stock_threshold: 20 },
  { name: 'Vitamin C 1000mg',     category: 'Supplement',         unit: 'tablets',  requires_prescription: false, price: 28000, stock_quantity: 600, low_stock_threshold: 80 },
  { name: 'Zinc 50mg',            category: 'Supplement',         unit: 'tablets',  requires_prescription: false, price: 20000, stock_quantity: 400, low_stock_threshold: 60 },
  { name: 'Diclofenac 50mg',      category: 'Anti-inflammatory',  unit: 'tablets',  requires_prescription: true,  price: 32000, stock_quantity: 160, low_stock_threshold: 25 },
  { name: 'Pantoprazole 40mg',    category: 'Antacid',            unit: 'tablets',  requires_prescription: true,  price: 42000, stock_quantity: 140, low_stock_threshold: 20 },
];

export const seedMedications = async (): Promise<void> => {
  try {
    const existing = await Medication.countDocuments();
    if (existing >= SEED_MEDICATIONS.length) {
      console.log('Medications already seeded');
      return;
    }

    for (const med of SEED_MEDICATIONS) {
      const exists = await Medication.findOne({ name: med.name });
      if (exists) continue;
      await Medication.create(med);
    }

    console.log('✅ Medications seeded successfully');
  } catch (err) {
    console.error('Medication seed error:', err);
  }
};
