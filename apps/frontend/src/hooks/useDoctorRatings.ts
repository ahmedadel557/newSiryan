'use client';
import { useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';

interface RatingItem {
  stars: number;
  feedback: string | null;
  created_at: string;
  patient_name?: string;
}

export function useDoctorRatings() {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<RatingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    doctorService
      .getMyRatings()
      .then((data) => {
        if (cancelled) return;
        setAvg(data.avg);
        setCount(data.count);
        setRecent(data.recent ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { avg, count, recent, isLoading };
}
