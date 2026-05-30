import { cache } from './cache';
import { CACHE_KEYS, CACHE_TTL } from '../config/cacheTtl';

export const APPOINTMENT_FEES = {
  physical: 500,
  online: 300,
} as const;

export const LAB_FEE = 200;
export const RADIOLOGY_FEE = 400;

export type AppointmentType = keyof typeof APPOINTMENT_FEES;

export function feeForAppointmentType(type: AppointmentType): number {
  return APPOINTMENT_FEES[type];
}

export async function getPricingSettings(): Promise<Record<string, any>> {
  try {
    const cached = await cache.get<Record<string, any>>(CACHE_KEYS.PRICING_SETTINGS);
    if (cached) return cached;

    const PricingSettings = (await import('../models/PricingSettings')).default;
    const settings = await PricingSettings.findOne().lean();
    if (settings) {
      await cache.set(CACHE_KEYS.PRICING_SETTINGS, settings, CACHE_TTL.PRICING_SETTINGS);
      return settings as Record<string, any>;
    }
  } catch { /* fallback to constants */ }

  return {
    appointments: { physical_fee: APPOINTMENT_FEES.physical, online_fee: APPOINTMENT_FEES.online },
    rooms: { general_per_day: 200, icu_per_day: 800, operation_per_day: 600, radiology_per_day: 400 },
    pharmacy: { delivery_fee: 50 },
    lab: [],
    radiology: [],
  };
}
