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

export interface PopulatedUserRef {
  id: string;
  first_name?: string;
  last_name?: string;
  specialization?: string;
}

export interface VitalsSnapshot {
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  temperature?: number;
  oxygen_level?: number;
  blood_sugar?: number;
  recorded_at?: Date;
}

export interface EmergencyFlag {
  id: string;
  patient: string | PopulatedUserRef;
  nurse: string | PopulatedUserRef;
  doctor: string | PopulatedUserRef;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'notified' | 'acknowledged' | 'resolved';
  vitals_snapshot?: VitalsSnapshot;
  notes?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
  createdAt: Date;
}
