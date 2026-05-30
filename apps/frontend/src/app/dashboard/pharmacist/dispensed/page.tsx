import { redirect } from 'next/navigation';

export default function PharmacistDispensedRedirect() {
  redirect('/dashboard/pharmacist/history');
}
