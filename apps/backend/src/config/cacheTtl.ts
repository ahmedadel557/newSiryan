export const CACHE_TTL = {
  PRICING_SETTINGS:    3600,  // 1 hour
  DOCTOR_SCHEDULE:      900,  // 15 minutes
  APPOINTMENT_SLOTS:    300,  // 5 minutes
  MEDICATIONS:         1800,  // 30 minutes
  INSURANCE_COMPANIES: 3600,  // 1 hour
  ROOM_AVAILABILITY:    300,  // 5 minutes
  PATIENT_PROFILE:      600,  // 10 minutes
} as const;

export const CACHE_KEYS = {
  PRICING_SETTINGS:         'settings:pricing',
  MEDICATIONS:              'pharmacy:medications',
  INSURANCE_COMPANIES:      'insurance:companies',
  INSURANCE_COMPANIES_ACTIVE: 'insurance:companies:active',
  ROOM_AVAILABILITY:        'rooms:availability',

  DOCTOR_SCHEDULE: (doctorId: string) => `schedule:doctor:${doctorId}`,
  SLOTS:           (doctorId: string, date: string) => `slots:${doctorId}:${date}`,
  PATIENT_PROFILE: (userId: string)   => `profile:${userId}`,
  TOKEN_BLACKLIST: (hash: string)     => `blacklist:${hash}`,
} as const;
