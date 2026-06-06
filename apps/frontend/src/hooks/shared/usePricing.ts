'use client';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings.service';
import { queryKeys } from '@/lib/queryKeys';
import type { PricingSettings } from '@/types';

const DEFAULT_PRICING: PricingSettings = {
  appointments: { physical_fee: 500, online_fee: 300 },
  rooms: { general_per_day: 200, icu_per_day: 800, operation_per_day: 600, radiology_per_day: 400 },
  pharmacy: { delivery_fee: 50 },
  lab: [],
  radiology: [],
};

export function usePricing() {
  const { data, isLoading } = useQuery<PricingSettings>({
    queryKey: queryKeys.publicPricing(),
    queryFn: () => settingsService.getPublicPricing(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const pricing = data ?? DEFAULT_PRICING;

  return {
    pricing,
    pricingLoading: isLoading,
    appointmentFee: (type: 'physical' | 'online') =>
      type === 'online' ? pricing.appointments.online_fee : pricing.appointments.physical_fee,
  };
}
