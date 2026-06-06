import ShiftDefinition from '../models/ShiftDefinition';

const DEFAULT_SHIFTS = [
  { name: 'Morning',   start_time: '08:00', end_time: '14:00' },
  { name: 'Afternoon', start_time: '14:00', end_time: '20:00' },
  { name: 'Night',     start_time: '20:00', end_time: '08:00' },
];

export const seedShiftDefinitions = async () => {
  try {
    for (const s of DEFAULT_SHIFTS) {
      await ShiftDefinition.updateOne(
        { name: s.name },
        { $setOnInsert: { ...s, is_active: true } },
        { upsert: true },
      );
    }
    console.log('✅ ShiftDefinitions seeded');
  } catch (err) {
    console.error('ShiftDefinitions seed error:', err);
  }
};
