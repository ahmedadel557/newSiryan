export type Role =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'inventory_manager'
  | 'lab_technician'
  | 'radiology_technician'
  | 'cashier'
  | 'admin';

export interface VideoCallToken {
  callId: string;
  token: string;
  apiKey: string;
  status?: 'waiting' | 'active' | 'ended';
}

export interface DoctorQueueItem {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  type: 'physical' | 'online';
  status: string;
  scheduled_at: Date;
}
