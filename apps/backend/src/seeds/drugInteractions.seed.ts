import Medication from '../models/Medication';
import DrugInteraction from '../models/DrugInteraction';

interface SeedInteraction {
  name_a: string;
  name_b: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

const SEED_INTERACTIONS: SeedInteraction[] = [
  // Severe
  {
    name_a: 'Warfarin 5mg',
    name_b: 'Ibuprofen 400mg',
    severity: 'severe',
    description: 'NSAIDs increase anticoagulant effect of warfarin, significantly raising bleeding risk.',
  },
  {
    name_a: 'Metformin 500mg',
    name_b: 'Ibuprofen 400mg',
    severity: 'severe',
    description: 'NSAIDs can impair renal function and increase lactic acidosis risk with metformin.',
  },
  {
    name_a: 'Amoxicillin 250mg',
    name_b: 'Metronidazole 250mg',
    severity: 'severe',
    description: 'Concurrent use increases risk of antibiotic-associated colitis and resistance.',
  },
  {
    name_a: 'Atorvastatin 10mg',
    name_b: 'Amlodipine 5mg',
    severity: 'severe',
    description: 'Amlodipine increases atorvastatin plasma levels, raising myopathy and rhabdomyolysis risk.',
  },
  {
    name_a: 'Salbutamol Inhaler',
    name_b: 'Amlodipine 5mg',
    severity: 'severe',
    description: 'Calcium channel blockers may antagonise bronchodilator effect in severe asthma.',
  },
  // Moderate
  {
    name_a: 'Omeprazole 20mg',
    name_b: 'Metformin 500mg',
    severity: 'moderate',
    description: 'PPIs may reduce metformin absorption by altering gastric pH; monitor glycaemic control.',
  },
  {
    name_a: 'Cetirizine 10mg',
    name_b: 'Loratadine 10mg',
    severity: 'moderate',
    description: 'Concurrent antihistamines increase sedative effects and risk of anticholinergic side effects.',
  },
  {
    name_a: 'Ibuprofen 400mg',
    name_b: 'Diclofenac 50mg',
    severity: 'moderate',
    description: 'Combining two NSAIDs increases GI bleeding risk without additional analgesic benefit.',
  },
  {
    name_a: 'Paracetamol 500mg',
    name_b: 'Metronidazole 250mg',
    severity: 'moderate',
    description: 'Metronidazole can inhibit paracetamol metabolism, increasing risk of hepatotoxicity at high doses.',
  },
  {
    name_a: 'Pantoprazole 40mg',
    name_b: 'Omeprazole 20mg',
    severity: 'moderate',
    description: 'Concurrent use of two PPIs offers no additional benefit and may increase side effect risk.',
  },
  // Mild
  {
    name_a: 'Vitamin C 1000mg',
    name_b: 'Amoxicillin 250mg',
    severity: 'mild',
    description: 'High-dose Vitamin C may slightly increase amoxicillin absorption; generally well-tolerated.',
  },
  {
    name_a: 'Zinc 50mg',
    name_b: 'Cetirizine 10mg',
    severity: 'mild',
    description: 'Zinc may mildly enhance the anti-inflammatory effects of antihistamines.',
  },
  {
    name_a: 'Omeprazole 20mg',
    name_b: 'Amoxicillin 250mg',
    severity: 'mild',
    description: 'PPIs are commonly co-prescribed with amoxicillin for H. pylori; minor interaction, monitor for side effects.',
  },
  {
    name_a: 'Ibuprofen 400mg',
    name_b: 'Paracetamol 500mg',
    severity: 'mild',
    description: 'Safe to combine at recommended doses; mild additive effect but no major interaction.',
  },
  {
    name_a: 'Loratadine 10mg',
    name_b: 'Zinc 50mg',
    severity: 'mild',
    description: 'Zinc supplementation may slightly prolong the half-life of antihistamines; generally safe.',
  },
];

export const seedDrugInteractions = async (): Promise<void> => {
  try {
    const existing = await DrugInteraction.countDocuments();
    if (existing > 0) {
      console.log('Drug interactions already seeded');
      return;
    }

    let seeded = 0;
    for (const entry of SEED_INTERACTIONS) {
      const [medA, medB] = await Promise.all([
        Medication.findOne({ name: entry.name_a }).select('_id').lean(),
        Medication.findOne({ name: entry.name_b }).select('_id').lean(),
      ]);

      if (!medA || !medB) continue;

      await DrugInteraction.create({
        medication_a: medA._id,
        medication_b: medB._id,
        severity: entry.severity,
        description: entry.description,
      });
      seeded++;
    }

    console.log(`✅ Drug interactions seeded (${seeded} entries)`);
  } catch (err) {
    console.error('Drug interaction seed error:', err);
  }
};
