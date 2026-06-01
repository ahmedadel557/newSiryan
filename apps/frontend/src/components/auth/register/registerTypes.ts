import * as yup from 'yup';

/* ── Patient schema ────────────────────────────────────────── */
export const patientSchema = yup.object({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(
      /^(010|011|012|015)\d{8}$/,
      'Must be a valid Egyptian number (010, 011, 012, or 015)',
    ),
  username: yup
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores')
    .required('Username is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
  gender: yup
    .string()
    .oneOf(['male', 'female'], 'Select a gender')
    .required('Gender is required'),
  blood_type: yup.string().required('Blood type is required'),
  national_id: yup
    .string()
    .matches(/^\d{14}$/, 'Must be exactly 14 digits')
    .required('National ID is required'),
  insurance_provider: yup.string().default(''),
  insurance_number: yup.string().default(''),
  allergies: yup.string().default(''),
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[0-9]/, 'Must include a number')
    .matches(/[A-Z]/, 'Must include an uppercase letter')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  terms: yup
    .boolean()
    .oneOf([true], 'You must accept the terms')
    .required('You must accept the terms'),
});

export type PatientFields = yup.InferType<typeof patientSchema>;

/* ── Staff schema ──────────────────────────────────────────── */
export const staffSchema = yup.object({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(
      /^(010|011|012|015)\d{8}$/,
      'Must be a valid Egyptian number',
    ),
  role: yup
    .string()
    .oneOf(
      [
        'doctor',
        'nurse',
        'receptionist',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'cashier',
      ],
      'Select a role',
    )
    .required('Role is required'),
  department: yup.string().required('Department is required'),
  specialization: yup.string().default('').when('role', {
    is: 'doctor',
    then: (schema) => schema.required('Specialization is required'),
  }),
  national_id: yup
    .string()
    .matches(/^\d{14}$/, 'Must be exactly 14 digits')
    .required('National ID is required'),
  username: yup
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores')
    .required('Username is required'),
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[0-9]/, 'Must include a number')
    .matches(/[A-Z]/, 'Must include an uppercase letter')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  professional_confirm: yup
    .boolean()
    .oneOf([true], 'Please confirm your information is accurate')
    .required(),
  terms: yup
    .boolean()
    .oneOf([true], 'You must accept the terms')
    .required('You must accept the terms'),
});

export type StaffFields = yup.InferType<typeof staffSchema>;

/* ── Constants ─────────────────────────────────────────────── */
export const PATIENT_STEPS = [
  { n: 1, label: 'Personal' },
  { n: 2, label: 'Medical' },
  { n: 3, label: 'Security' },
];

export const STAFF_STEPS = [
  { n: 1, label: 'Professional' },
  { n: 2, label: 'Security' },
];

export const STAFF_ROLES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiology_technician', label: 'Radiology Technician' },
  { value: 'cashier', label: 'Cashier' },
];

export const DEPARTMENT_SPECIALIZATIONS: Record<string, string[]> = {
  Cardiology: ['Cardiologist', 'Interventional Cardiologist', 'Cardiac Surgeon'],
  Neurology: ['Neurologist', 'Neurosurgeon', 'Neurophysiologist'],
  Dermatology: ['Dermatologist', 'Cosmetic Dermatologist'],
  Orthopedics: ['Orthopedist', 'Spine Surgeon', 'Sports Medicine Specialist'],
  Pediatrics: ['Pediatrician', 'Neonatologist', 'Pediatric Surgeon'],
  'General Medicine': ['General Practitioner', 'Internist', 'Family Medicine'],
  Gynecology: ['Gynecologist', 'Obstetrician', 'Reproductive Endocrinologist'],
  Urology: ['Urologist', 'Pediatric Urologist'],
  Oncology: ['Oncologist', 'Radiation Oncologist', 'Surgical Oncologist'],
  Radiology: ['Radiologist', 'Interventional Radiologist'],
  Surgery: ['General Surgeon', 'Plastic Surgeon', 'Vascular Surgeon', 'Laparoscopic Surgeon'],
  Psychiatry: ['Psychiatrist', 'Psychologist', 'Psychotherapist'],
  Ophthalmology: ['Ophthalmologist', 'Retina Specialist'],
  ENT: ['ENT Specialist', 'Otologist', 'Rhinologist'],
  Emergency: ['Emergency Physician', 'Trauma Surgeon'],
  Anesthesiology: ['Anesthesiologist', 'Pain Management Specialist'],
  Laboratory: ['Lab Technician', 'Microbiologist', 'Pathologist', 'Hematologist'],
  Pharmacy: ['Clinical Pharmacist', 'Hospital Pharmacist'],
  Physiotherapy: ['Physiotherapist', 'Occupational Therapist'],
  Dentistry: ['Dentist', 'Orthodontist', 'Oral Surgeon'],
  Reception: ['Receptionist', 'Patient Coordinator'],
  Cashier: ['Cashier', 'Billing Specialist'],
  Administration: ['Administrator', 'HR Specialist', 'Operations Manager'],
};

export const PATIENT_STEP_DESCRIPTIONS = [
  'Start with the basics. Takes about a minute.',
  'Tell us a little more about you.',
  'Almost there — set your password.',
];
