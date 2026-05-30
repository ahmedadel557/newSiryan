export const APPOINTMENT_FEES = {
  physical: 500,
  online: 300,
} as const;

export type AppointmentVisitType = keyof typeof APPOINTMENT_FEES;

export function feeForVisitType(type: AppointmentVisitType): number {
  return APPOINTMENT_FEES[type];
}

export function formatEGP(amount: number): string {
  return `${amount.toLocaleString('en-EG')} EGP`;
}

export type MockPaymentMethod = 'card' | 'vodafone_cash' | 'fawry' | 'instapay';

export const MOCK_PAYMENT_METHODS: { value: MockPaymentMethod; label: string; sub: string }[] = [
  { value: 'card', label: 'Credit / debit card', sub: 'Visa, Mastercard, Meeza' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', sub: 'Pay from your wallet' },
  { value: 'fawry', label: 'Fawry', sub: 'Pay at any Fawry outlet' },
  { value: 'instapay', label: 'InstaPay', sub: 'Bank-to-bank transfer' },
];
