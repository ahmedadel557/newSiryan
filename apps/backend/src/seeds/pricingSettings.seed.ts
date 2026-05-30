import PricingSettings from '../models/PricingSettings';

export const seedPricingSettings = async () => {
  try {
    const exists = await PricingSettings.findOne();
    if (exists) return;
    await PricingSettings.create({});
    console.log('✅ PricingSettings seeded with defaults');
  } catch (err) {
    console.error('PricingSettings seed error:', err);
  }
};
