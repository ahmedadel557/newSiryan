"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { SubmitHandler } from "react-hook-form";
import * as yup from "yup";
import {
  Mail,
  Lock,
  Phone,
  AlertCircle,
  User,
  Check,
  Circle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CalendarCheck,
  Pill,
  HeartPulse,
  Video,
  ShieldCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import Image from "next/image";

function GoogleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import apiClient from "@/services/api.client";
import PasswordInput from "@/components/shared/PasswordInput";

const scenes = [
  {
    gradient: "linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)",
  },
  {
    gradient: "linear-gradient(135deg, #031412 0%, #163832 50%, #b4d4be 100%)",
  },
  {
    gradient: "linear-gradient(135deg, #1a8fc4 0%, #235347 60%, #DAF1DE 100%)",
  },
];

const features = [
  { Icon: Sparkles, text: "AI symptom check", x: "8%", y: "18%", delay: "0s" },
  {
    Icon: CalendarCheck,
    text: "Same-day booking",
    x: "5%",
    y: "55%",
    delay: "0.6s",
  },
  { Icon: Pill, text: "Pharmacy delivery", x: "12%", y: "82%", delay: "1.2s" },
  {
    Icon: HeartPulse,
    text: "Complete records",
    x: "72%",
    y: "12%",
    delay: "0.3s",
  },
  {
    Icon: Video,
    text: "Video consultations",
    x: "78%",
    y: "48%",
    delay: "0.9s",
  },
  {
    Icon: ShieldCheck,
    text: "Insurance built in",
    x: "68%",
    y: "80%",
    delay: "1.5s",
  },
];

const DEPARTMENT_SPECIALIZATIONS: Record<string, string[]> = {
  Cardiology: [
    "Cardiologist",
    "Interventional Cardiologist",
    "Cardiac Surgeon",
  ],
  Neurology: ["Neurologist", "Neurosurgeon", "Neurophysiologist"],
  Dermatology: ["Dermatologist", "Cosmetic Dermatologist"],
  Orthopedics: ["Orthopedist", "Spine Surgeon", "Sports Medicine Specialist"],
  Pediatrics: ["Pediatrician", "Neonatologist", "Pediatric Surgeon"],
  "General Medicine": ["General Practitioner", "Internist", "Family Medicine"],
  Gynecology: ["Gynecologist", "Obstetrician", "Reproductive Endocrinologist"],
  Urology: ["Urologist", "Pediatric Urologist"],
  Oncology: ["Oncologist", "Radiation Oncologist", "Surgical Oncologist"],
  Radiology: ["Radiologist", "Interventional Radiologist"],
  Surgery: [
    "General Surgeon",
    "Plastic Surgeon",
    "Vascular Surgeon",
    "Laparoscopic Surgeon",
  ],
  Psychiatry: ["Psychiatrist", "Psychologist", "Psychotherapist"],
  Ophthalmology: ["Ophthalmologist", "Retina Specialist"],
  ENT: ["ENT Specialist", "Otologist", "Rhinologist"],
  Emergency: ["Emergency Physician", "Trauma Surgeon"],
  Anesthesiology: ["Anesthesiologist", "Pain Management Specialist"],
  Laboratory: [
    "Lab Technician",
    "Microbiologist",
    "Pathologist",
    "Hematologist",
  ],
  Pharmacy: ["Clinical Pharmacist", "Hospital Pharmacist"],
  Physiotherapy: ["Physiotherapist", "Occupational Therapist"],
  Dentistry: ["Dentist", "Orthodontist", "Oral Surgeon"],
  Reception: ["Receptionist", "Patient Coordinator"],
  Cashier: ["Cashier", "Billing Specialist"],
  Administration: ["Administrator", "HR Specialist", "Operations Manager"],
};

/* ── Patient schema ────────────────────────────────────────── */
const patientSchema = yup.object({
  first_name: yup.string().required("First name is required"),
  last_name: yup.string().required("Last name is required"),
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(
      /^(010|011|012|015)\d{8}$/,
      "Must be a valid Egyptian number (010, 011, 012, or 015)",
    ),
  username: yup
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .required("Username is required"),
  date_of_birth: yup.string().required("Date of birth is required"),
  gender: yup
    .string()
    .oneOf(["male", "female"], "Select a gender")
    .required("Gender is required"),
  blood_type: yup.string().required("Blood type is required"),
  national_id: yup
    .string()
    .matches(/^\d{14}$/, "Must be exactly 14 digits")
    .required("National ID is required"),
  insurance_provider: yup.string().default(""),
  insurance_number: yup.string().default(""),
  allergies: yup.string().default(""),
  password: yup
    .string()
    .min(8, "At least 8 characters")
    .matches(/[0-9]/, "Must include a number")
    .matches(/[A-Z]/, "Must include an uppercase letter")
    .required("Password is required"),
  confirm_password: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
  terms: yup
    .boolean()
    .oneOf([true], "You must accept the terms")
    .required("You must accept the terms"),
});

type PatientFields = yup.InferType<typeof patientSchema>;

/* ── Staff schema ──────────────────────────────────────────── */
const staffSchema = yup.object({
  first_name: yup.string().required("First name is required"),

  last_name: yup.string().required("Last name is required"),

  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),

  phone: yup
    .string()
    .required("Phone number is required")
    .matches(
      /^(010|011|012|015)\d{8}$/,
      "Must be a valid Egyptian number",
    ),

  role: yup
    .string()
    .oneOf(
      [
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab_technician",
        "radiology_technician",
        "cashier",
      ],
      "Select a role",
    )
    .required("Role is required"),

  department: yup.string().required("Department is required"),

  specialization: yup.string().default("").when("role", {
    is: "doctor",
    then: (schema) => schema.required("Specialization is required"),
  }),

  national_id: yup
    .string()
    .matches(/^\d{14}$/, "Must be exactly 14 digits")
    .required("National ID is required"),

  username: yup
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .required("Username is required"),

  password: yup
    .string()
    .min(8, "At least 8 characters")
    .matches(/[0-9]/, "Must include a number")
    .matches(/[A-Z]/, "Must include an uppercase letter")
    .required("Password is required"),

  confirm_password: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),

  professional_confirm: yup
    .boolean()
    .oneOf([true], "Please confirm your information is accurate")
    .required(),

  terms: yup
    .boolean()
    .oneOf([true], "You must accept the terms")
    .required("You must accept the terms"),
});

type StaffFields = yup.InferType<typeof staffSchema>;

const PATIENT_STEPS = [
  { n: 1, label: "Personal" },
  { n: 2, label: "Medical" },
  { n: 3, label: "Security" },
];
const STAFF_STEPS = [
  { n: 1, label: "Professional" },
  { n: 2, label: "Security" },
];

const STAFF_ROLES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "radiology_technician", label: "Radiology Technician" },
  { value: "cashier", label: "Cashier" },
];

type UsernameStatus = "idle" | "checking" | "available" | "taken";

/* ── Component ───────────────────────────────────────────────── */
export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const router = useRouter();
  const [bgIndex, setBgIndex] = useState(0);
  const [tabType, setTabType] = useState<"patient" | "staff">("patient");

  /* patient state */
  const [patientStep, setPatientStep] = useState(1);
  const [patientApiError, setPatientApiError] = useState("");
  const [patientUsernameStatus, setPatientUsernameStatus] =
    useState<UsernameStatus>("idle");

  /* staff state */
  const [staffStep, setStaffStep] = useState(1);
  const [staffApiError, setStaffApiError] = useState("");
  const [staffUsernameStatus, setStaffUsernameStatus] =
    useState<UsernameStatus>("idle");
  const [staffSuccess, setStaffSuccess] = useState<{ email: string } | null>(
    null,
  );

  useEffect(() => {
    const t = setInterval(
      () => setBgIndex((i) => (i + 1) % scenes.length),
      5000,
    );
    return () => clearInterval(t);
  }, []);

  /* ── Patient form ── */
  const {
    register: pReg,
    handleSubmit: pHandleSubmit,
    trigger: pTrigger,
    watch: pWatch,
    formState: { errors: pErrors, isSubmitting: pIsSubmitting },
  } = useForm<PatientFields>({
    resolver: yupResolver(patientSchema),
    mode: "onTouched",
  });

  const pPw = pWatch("password") ?? "";
  const pUsernameVal = pWatch("username") ?? "";

  const checkPatientUsername = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string) => {
        clearTimeout(timer);
        if (!val || val.length < 3) {
          setPatientUsernameStatus("idle");
          return;
        }
        setPatientUsernameStatus("checking");
        timer = setTimeout(async () => {
          try {
            const { available } = await authService.checkUsername(val);
            setPatientUsernameStatus(available ? "available" : "taken");
          } catch {
            setPatientUsernameStatus("idle");
          }
        }, 300);
      };
    })(),
    [],
  );

  useEffect(() => {
    checkPatientUsername(pUsernameVal);
  }, [pUsernameVal]);

  const pStrengthChecks = [
    { label: "8+ characters", met: pPw.length >= 8 },
    { label: "One number", met: /[0-9]/.test(pPw) },
    { label: "One uppercase", met: /[A-Z]/.test(pPw) },
  ];

  async function patientGoNext() {
    const fieldsByStep: Record<number, (keyof PatientFields)[]> = {
      1: ["first_name", "last_name", "email", "phone", "username"],
      2: ["date_of_birth", "gender", "blood_type", "national_id"],
    };
    if (patientStep === 1 && patientUsernameStatus === "taken") return;
    const valid = await pTrigger(fieldsByStep[patientStep]);
    if (valid) setPatientStep((s) => s + 1);
  }

  async function patientOnSubmit(data: PatientFields) {
    setPatientApiError("");
    try {
      await authRegister({
        username: data.username,
        email: data.email,
        password: data.password,
        profile: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          gender: data.gender as "male" | "female",
          blood_type: data.blood_type,
          national_id: data.national_id,
          insurance_provider: data.insurance_provider,
          insurance_number: data.insurance_number,
          allergies: data.allergies,
        },
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setPatientApiError(msg || "Registration failed. Please try again.");
    }
  }

  function pCircleClass(n: number) {
    if (n < patientStep) return "done";
    if (n === patientStep) return "current";
    return "upcoming";
  }

  /* ── Staff form ── */
  const {
    register: sReg,
    handleSubmit: sHandleSubmit,
    trigger: sTrigger,
    watch: sWatch,
    setValue: sSetValue,
    formState: { errors: sErrors, isSubmitting: sIsSubmitting },
  } = useForm<StaffFields>({
    resolver: yupResolver(staffSchema),
    mode: "onTouched",
  });

  const sPw = sWatch("password") ?? "";
  const sUsernameVal = sWatch("username") ?? "";
  const sRole = sWatch("role") ?? "";
  const selectedDepartment = sWatch("department") ?? "";
  const availableSpecializations =
    DEPARTMENT_SPECIALIZATIONS[selectedDepartment] || [];

  useEffect(() => {
    sSetValue("specialization", "");
  }, [selectedDepartment]);

  const checkStaffUsername = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string) => {
        clearTimeout(timer);
        if (!val || val.length < 3) {
          setStaffUsernameStatus("idle");
          return;
        }
        setStaffUsernameStatus("checking");
        timer = setTimeout(async () => {
          try {
            const { available } = await authService.checkUsername(val);
            setStaffUsernameStatus(available ? "available" : "taken");
          } catch {
            setStaffUsernameStatus("idle");
          }
        }, 300);
      };
    })(),
    [],
  );

  useEffect(() => {
    checkStaffUsername(sUsernameVal);
  }, [sUsernameVal]);

  const sStrengthChecks = [
    { label: "8+ characters", met: sPw.length >= 8 },
    { label: "One number", met: /[0-9]/.test(sPw) },
    { label: "One uppercase", met: /[A-Z]/.test(sPw) },
  ];

  async function staffGoNext() {
    const baseFields: (keyof StaffFields)[] = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "role",
      "department",
      "national_id",
    ];
    const valid = await sTrigger(baseFields);
    if (valid) {
      if (sRole === "doctor" && !sWatch("specialization")) {
        return;
      }
      setStaffStep(2);
    }
  }

 const staffOnSubmit: SubmitHandler<StaffFields> = async (data) => {
  setStaffApiError("");

  if (staffUsernameStatus === "taken") return;

  try {
    await apiClient.post("/auth/register/staff", {
      username: data.username,
      email: data.email,
      password: data.password,
      confirm_password: data.confirm_password,
      role: data.role,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      department: data.department,
      specialization: data.specialization || undefined,
      national_id: data.national_id,
    });

    setStaffSuccess({ email: data.email });
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;

    setStaffApiError(msg || "Registration failed. Please try again.");
  }
};

  function sCircleClass(n: number) {
    if (n < staffStep) return "done";
    if (n === staffStep) return "current";
    return "upcoming";
  }

  function switchTab(t: "patient" | "staff") {
    setTabType(t);
    setPatientStep(1);
    setStaffStep(1);
    setPatientApiError("");
    setStaffApiError("");
  }

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        {scenes.map((s, i) => (
          <div
            key={i}
            className={`auth-bg-layer ${i === bgIndex ? "is-active" : ""}`}
            style={{ background: s.gradient }}
          />
        ))}
        <div className="auth-floats">
          {features.map(({ Icon, text, x, y, delay }, i) => (
            <div
              key={i}
              className="auth-float"
              style={{ left: x, top: y, animationDelay: delay }}
            >
              <Icon size={14} strokeWidth={1.75} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <svg
          className="auth-pulse"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <path
            d="M0,100 L300,100 L350,30 L400,170 L450,60 L500,140 L550,100 L1200,100"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="auth-watermark">
          <img src="/assets/siryan-logo.png" alt="" />
        </div>
      </div>

      {/* Card */}
      <div className="auth-card-wrap" style={{ maxWidth: 460 }}>
        <div className="auth-card">
          <div className="auth-card-header">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/siryan-logo.png"
                alt="Siryan Logo"
                className="auth-logo"
                width={64}
                height={64}
                priority
              />
              <span className="auth-brand">Siryan</span>
            </Link>
          </div>

          {/* Staff success screen */}
          {staffSuccess ? (
            <div
              className="auth-form-content"
              style={{ textAlign: "center", padding: "24px 20px" }}
            >
              <CheckCircle2
                size={64}
                strokeWidth={1.5}
                style={{ color: "var(--positive)", margin: "0 auto 16px" }}
              />
              <h1 className="auth-title">Request submitted successfully</h1>
              <p className="auth-lede" style={{ marginBottom: 8 }}>
                We&apos;ll review your application and send a confirmation to:
              </p>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--fg-1)",
                  marginBottom: 24,
                }}
              >
                {staffSuccess.email}
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <button
                  className="btn btn-primary btn-lg auth-submit auth-submit-dark "
                  onClick={() => router.push("/")}
                >
                  Back to home
                </button>
                <Link
                  href="/auth/login"
                  className="auth-switch"
                  style={{ textAlign: "center" }}
                >
                  Sign in →
                </Link>
              </div>
            </div>
          ) : (
            <div className="auth-form-content">
              <h1 className="auth-title">Create your account</h1>

              {/* Tab switcher */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  padding: 4,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => switchTab("patient")}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      tabType === "patient"
                        ? "var(--bg-surface)"
                        : "transparent",
                    color:
                      tabType === "patient" ? "var(--fg-1)" : "var(--fg-3)",
                    boxShadow:
                      tabType === "patient"
                        ? "0 1px 3px rgba(0,0,0,0.1)"
                        : "none",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <User
                    size={13}
                    strokeWidth={2}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                    }}
                  />
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("staff")}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      tabType === "staff" ? "var(--bg-surface)" : "transparent",
                    color: tabType === "staff" ? "var(--fg-1)" : "var(--fg-3)",
                    boxShadow:
                      tabType === "staff"
                        ? "0 1px 3px rgba(0,0,0,0.1)"
                        : "none",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Briefcase
                    size={13}
                    strokeWidth={2}
                    style={{
                      display: "inline",

                      verticalAlign: "middle",
                    }}
                  />
                  Staff
                </button>
              </div>

              {/* ══════════════ PATIENT TAB ══════════════ */}
              {tabType === "patient" && (
                <>
                  <p className="auth-lede">
                    {
                      [
                        "Start with the basics. Takes about a minute.",
                        "Tell us a little more about you.",
                        "Almost there — set your password.",
                      ][patientStep - 1]
                    }
                  </p>

                  {/* Step indicator */}
                  <div className="reg-steps">
                    {PATIENT_STEPS.map((s, i) => (
                      <div key={s.n} style={{ display: "contents" }}>
                        <div className="reg-step-wrap">
                          <div
                            className={`reg-step-circle ${pCircleClass(s.n)}`}
                          >
                            {s.n < patientStep ? (
                              <Check size={13} strokeWidth={2.5} />
                            ) : (
                              s.n
                            )}
                          </div>
                          <span
                            className={`reg-step-label ${pCircleClass(s.n)}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < PATIENT_STEPS.length - 1 && (
                          <div
                            className={`reg-step-line ${s.n < patientStep ? "done" : "upcoming"}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1 — Personal */}
                  {patientStep === 1 && (
                    <div className="reg-fields">
                      <div className="reg-grid-2">
                        <div className="field">
                          <label className="field-label">First name</label>
                          <input
                            className="input"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Layla"
                            {...pReg("first_name")}
                          />
                          {pErrors.first_name && (
                            <p className="auth-field-error">
                              {pErrors.first_name.message}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">Last name</label>
                          <input
                            className="input"
                            type="text"
                            autoComplete="family-name"
                            placeholder="Karam"
                            {...pReg("last_name")}
                          />
                          {pErrors.last_name && (
                            <p className="auth-field-error">
                              {pErrors.last_name.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="field">
                        <label className="field-label">Email</label>
                        <div className="auth-input-wrap">
                          <Mail size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            {...pReg("email")}
                          />
                        </div>
                        {pErrors.email && (
                          <p className="auth-field-error">
                            {pErrors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="field">
                        <label className="field-label">Phone</label>
                        <div className="auth-input-wrap">
                          <Phone size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="tel"
                            autoComplete="tel"
                            placeholder="01xxxxxxxxx"
                            maxLength={11}
                            {...pReg("phone")}
                          />
                        </div>
                        {pErrors.phone ? (
                          <p className="auth-field-error">
                            {pErrors.phone.message}
                          </p>
                        ) : (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--fg-3)",
                              marginTop: 4,
                            }}
                          >
                            Egyptian number starting with 010, 011, 012, or 015
                          </p>
                        )}
                      </div>
                      <div className="field">
                        <label className="field-label">Username</label>
                        <div className="auth-input-wrap">
                          <User size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="text"
                            autoComplete="username"
                            placeholder="choose_a_username"
                            {...pReg("username")}
                          />
                        </div>
                        {patientUsernameStatus === "checking" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--fg-3)",
                              marginTop: 4,
                            }}
                          >
                            Checking…
                          </p>
                        )}
                        {patientUsernameStatus === "available" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "#16a34a",
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Check size={13} strokeWidth={2.5} /> Available
                          </p>
                        )}
                        {patientUsernameStatus === "taken" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--error)",
                              marginTop: 4,
                            }}
                          >
                            Username already taken
                          </p>
                        )}
                        {pErrors.username && (
                          <p className="auth-field-error">
                            {pErrors.username.message}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={patientGoNext}
                        className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                      >
                        Continue <ArrowRight size={15} strokeWidth={2} />
                      </button>
                      <div className="auth-divider">
                        <span>or continue with</span>
                      </div>
                      <button
                        type="button"
                        className="btn auth-social-btn"
                        onClick={() => {
                          window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
                        }}
                      >
                        <GoogleIcon />
                        Sign up with Google
                      </button>
                    </div>
                  )}

                  {/* Step 2 — Medical */}
                  {patientStep === 2 && (
                    <div className="reg-fields">
                      <div className="reg-grid-2">
                        <div className="field">
                          <label className="field-label">Date of birth</label>
                          <input
                            className="input"
                            type="date"
                            {...pReg("date_of_birth")}
                          />
                          {pErrors.date_of_birth && (
                            <p className="auth-field-error">
                              {pErrors.date_of_birth.message}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">Gender</label>
                          <select className="input select" {...pReg("gender")}>
                            <option value="">Select…</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          {pErrors.gender && (
                            <p className="auth-field-error">
                              {pErrors.gender.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="reg-grid-2">
                        <div className="field">
                          <label className="field-label">Blood type</label>
                          <select
                            className="input select"
                            {...pReg("blood_type")}
                          >
                            <option value="">Select…</option>
                            {[
                              "A+",
                              "A-",
                              "B+",
                              "B-",
                              "AB+",
                              "AB-",
                              "O+",
                              "O-",
                            ].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {pErrors.blood_type && (
                            <p className="auth-field-error">
                              {pErrors.blood_type.message}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">
                            Insurance provider
                          </label>
                          <select
                            className="input select"
                            {...pReg("insurance_provider")}
                          >
                            <option value="">Select…</option>
                            <option value="NSSF">NSSF</option>
                            <option value="Private">Private</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label className="field-label">
                          Insurance number{" "}
                          <span
                            style={{ color: "var(--fg-3)", fontWeight: 400 }}
                          >
                            (optional)
                          </span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="e.g. NSSF-2024-12345"
                          {...pReg("insurance_number")}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">
                          Known allergies{" "}
                          <span
                            style={{ color: "var(--fg-3)", fontWeight: 400 }}
                          >
                            (optional)
                          </span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="e.g. Penicillin, peanuts"
                          {...pReg("allergies")}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">National ID</label>
                        <input
                          className="input"
                          type="text"
                          inputMode="numeric"
                          maxLength={14}
                          placeholder="Enter your 14-digit national ID"
                          {...pReg("national_id")}
                        />
                        {pErrors.national_id ? (
                          <p className="auth-field-error">
                            {pErrors.national_id.message}
                          </p>
                        ) : (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--fg-3)",
                              marginTop: 4,
                            }}
                          >
                            Kept secure and never shared
                          </p>
                        )}
                      </div>
                      <div className="reg-btn-row">
                        <button
                          type="button"
                          className="btn btn-ghost-back"
                          onClick={() => setPatientStep(1)}
                        >
                          <ArrowLeft size={14} strokeWidth={2} /> Back
                        </button>
                        <button
                          type="button"
                          onClick={patientGoNext}
                          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                          style={{ flex: 1 }}
                        >
                          Continue <ArrowRight size={15} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 — Security */}
                  {patientStep === 3 && (
                    <form
                      onSubmit={pHandleSubmit(patientOnSubmit)}
                      className="reg-fields"
                    >
                      <PasswordInput
                        label="Create a password"
                        placeholder="••••••••"
                        registration={pReg("password")}
                        error={pErrors.password?.message}
                        autoComplete="new-password"
                      >
                        <div className="reg-strength">
                          {pStrengthChecks.map(({ label, met }) => (
                            <span
                              key={label}
                              className={`reg-hint${met ? " met" : ""}`}
                            >
                              {met ? (
                                <CheckCircle2 size={13} strokeWidth={2} />
                              ) : (
                                <Circle size={13} strokeWidth={1.75} />
                              )}
                              {label}
                            </span>
                          ))}
                        </div>
                      </PasswordInput>
                      <PasswordInput
                        label="Confirm password"
                        placeholder="Re-enter password"
                        registration={pReg("confirm_password")}
                        error={pErrors.confirm_password?.message}
                        autoComplete="new-password"
                      />
                      <label className="reg-terms-row">
                        <input type="checkbox" {...pReg("terms")} />
                        <span>
                          I agree to Siryan&apos;s{" "}
                          <Link href="/terms">Terms of Service</Link> and{" "}
                          <Link href="/privacy">Privacy Policy</Link>
                        </span>
                      </label>
                      {pErrors.terms && (
                        <p className="auth-field-error">
                          {pErrors.terms.message}
                        </p>
                      )}
                      {patientApiError && (
                        <div className="reg-err">
                          <AlertCircle size={16} strokeWidth={1.75} />
                          <span>{patientApiError}</span>
                        </div>
                      )}
                      <div className="reg-btn-row">
                        <button
                          type="button"
                          className="btn btn-ghost-back"
                          onClick={() => setPatientStep(2)}
                        >
                          <ArrowLeft size={14} strokeWidth={2} /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={pIsSubmitting}
                          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                          style={{ flex: 1 }}
                        >
                          <Check size={15} strokeWidth={2.5} />
                          {pIsSubmitting
                            ? "Creating account…"
                            : "Create account"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* ══════════════ STAFF TAB ══════════════ */}
              {tabType === "staff" && (
                <>
                  <p className="auth-lede">
                    {staffStep === 1
                      ? "Tell us about your professional background."
                      : "Set up your login credentials."}
                  </p>

                  {/* Step indicator */}
                  <div className="reg-steps">
                    {STAFF_STEPS.map((s, i) => (
                      <div key={s.n} style={{ display: "contents" }}>
                        <div className="reg-step-wrap">
                          <div
                            className={`reg-step-circle ${sCircleClass(s.n)}`}
                          >
                            {s.n < staffStep ? (
                              <Check size={13} strokeWidth={2.5} />
                            ) : (
                              s.n
                            )}
                          </div>
                          <span
                            className={`reg-step-label ${sCircleClass(s.n)}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < STAFF_STEPS.length - 1 && (
                          <div
                            className={`reg-step-line ${s.n < staffStep ? "done" : "upcoming"}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1 — Professional */}
                  {staffStep === 1 && (
                    <div className="reg-fields">
                      <div className="reg-grid-2">
                        <div className="field">
                          <label className="field-label">First name</label>
                          <input
                            className="input"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Ahmed"
                            {...sReg("first_name")}
                          />
                          {sErrors.first_name && (
                            <p className="auth-field-error">
                              {sErrors.first_name.message}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">Last name</label>
                          <input
                            className="input"
                            type="text"
                            autoComplete="family-name"
                            placeholder="Khalil"
                            {...sReg("last_name")}
                          />
                          {sErrors.last_name && (
                            <p className="auth-field-error">
                              {sErrors.last_name.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="field">
                        <label className="field-label">Email</label>
                        <div className="auth-input-wrap">
                          <Mail size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            {...sReg("email")}
                          />
                        </div>
                        {sErrors.email && (
                          <p className="auth-field-error">
                            {sErrors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="field">
                        <label className="field-label">Phone</label>
                        <div className="auth-input-wrap">
                          <Phone size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="tel"
                            autoComplete="tel"
                            placeholder="01xxxxxxxxx"
                            maxLength={11}
                            {...sReg("phone")}
                          />
                        </div>
                        {sErrors.phone && (
                          <p className="auth-field-error">
                            {sErrors.phone.message}
                          </p>
                        )}
                      </div>
                      <div className="reg-grid-2">
                        <div className="field">
                          <label className="field-label">Role</label>
                          <select className="input select" {...sReg("role")}>
                            <option value="">Select role…</option>
                            {STAFF_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          {sErrors.role && (
                            <p className="auth-field-error">
                              {sErrors.role.message}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">Department</label>
                          <div className="auth-input-wrap">
                            <Building2 size={16} strokeWidth={1.75} />
                            <select className="input" {...sReg("department")}>
                              <option value="">Select department…</option>
                              {Object.keys(DEPARTMENT_SPECIALIZATIONS).map(
                                (dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                          {sErrors.department && (
                            <p className="auth-field-error">
                              {sErrors.department.message}
                            </p>
                          )}
                        </div>
                      </div>
                      {sRole === "doctor" && (
                        <div className="field">
                          <label className="field-label">Specialization</label>
                          <select
                            className="input select"
                            {...sReg("specialization")}
                            disabled={!selectedDepartment}
                          >
                            <option value="">
                              {selectedDepartment
                                ? "Select specialization…"
                                : "Select department first"}
                            </option>
                            {availableSpecializations.map((spec) => (
                              <option key={spec} value={spec}>
                                {spec}
                              </option>
                            ))}
                          </select>
                          {sErrors.specialization && (
                            <p className="auth-field-error">
                              {sErrors.specialization.message}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="field">
                        <label className="field-label">National ID</label>
                        <input
                          className="input"
                          type="text"
                          inputMode="numeric"
                          maxLength={14}
                          placeholder="14-digit national ID"
                          {...sReg("national_id")}
                        />
                        {sErrors.national_id && (
                          <p className="auth-field-error">
                            {sErrors.national_id.message}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={staffGoNext}
                        className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                      >
                        Continue <ArrowRight size={15} strokeWidth={2} />
                      </button>
                    </div>
                  )}

                  {/* Step 2 — Security */}
                  {staffStep === 2 && (
                    <form
                      onSubmit={sHandleSubmit(staffOnSubmit)}
                      className="reg-fields"
                    >
                      <div className="field">
                        <label className="field-label">Username</label>
                        <div className="auth-input-wrap">
                          <User size={16} strokeWidth={1.75} />
                          <input
                            className="input"
                            type="text"
                            autoComplete="username"
                            placeholder="choose_a_username"
                            {...sReg("username")}
                          />
                        </div>
                        {staffUsernameStatus === "checking" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--fg-3)",
                              marginTop: 4,
                            }}
                          >
                            Checking…
                          </p>
                        )}
                        {staffUsernameStatus === "available" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "#16a34a",
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Check size={13} strokeWidth={2.5} /> Available
                          </p>
                        )}
                        {staffUsernameStatus === "taken" && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--error)",
                              marginTop: 4,
                            }}
                          >
                            Username already taken
                          </p>
                        )}
                        {sErrors.username && (
                          <p className="auth-field-error">
                            {sErrors.username.message}
                          </p>
                        )}
                      </div>
                      <PasswordInput
                        label="Create a password"
                        placeholder="••••••••"
                        registration={sReg("password")}
                        error={sErrors.password?.message}
                        autoComplete="new-password"
                      >
                        <div className="reg-strength">
                          {sStrengthChecks.map(({ label, met }) => (
                            <span
                              key={label}
                              className={`reg-hint${met ? " met" : ""}`}
                            >
                              {met ? (
                                <CheckCircle2 size={13} strokeWidth={2} />
                              ) : (
                                <Circle size={13} strokeWidth={1.75} />
                              )}
                              {label}
                            </span>
                          ))}
                        </div>
                      </PasswordInput>
                      <PasswordInput
                        label="Confirm password"
                        placeholder="Re-enter password"
                        registration={sReg("confirm_password")}
                        error={sErrors.confirm_password?.message}
                        autoComplete="new-password"
                      />
                      <label className="reg-terms-row">
                        <input
                          type="checkbox"
                          {...sReg("professional_confirm")}
                        />
                        <span>
                          I confirm that my professional information is accurate
                          and complete
                        </span>
                      </label>
                      {sErrors.professional_confirm && (
                        <p className="auth-field-error">
                          {sErrors.professional_confirm.message}
                        </p>
                      )}
                      <label className="reg-terms-row">
                        <input type="checkbox" {...sReg("terms")} />
                        <span>
                          I agree to Siryan&apos;s{" "}
                          <Link href="/terms">Terms of Service</Link> and{" "}
                          <Link href="/privacy">Privacy Policy</Link>
                        </span>
                      </label>
                      {sErrors.terms && (
                        <p className="auth-field-error">
                          {sErrors.terms.message}
                        </p>
                      )}
                      {staffApiError && (
                        <div className="reg-err">
                          <AlertCircle size={16} strokeWidth={1.75} />
                          <span>{staffApiError}</span>
                        </div>
                      )}
                      <div className="reg-btn-row">
                        <button
                          type="button"
                          className="btn btn-ghost-back"
                          onClick={() => setStaffStep(1)}
                        >
                          <ArrowLeft size={14} strokeWidth={2} /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={
                            sIsSubmitting || staffUsernameStatus === "taken"
                          }
                          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
                          style={{ flex: 1 }}
                        >
                          <Check size={15} strokeWidth={2.5} />
                          {sIsSubmitting ? "Submitting…" : "Submit request"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              <p className="auth-switch">
                Already have an account?{" "}
                <Link href="/auth/login">Sign in →</Link>
              </p>
            </div>
          )}
        </div>

        <div className="auth-trust">
          <span>
            <Lock size={13} strokeWidth={1.75} /> 256-bit encryption
          </span>
          <span>
            <ShieldCheck size={13} strokeWidth={1.75} /> HIPAA compliant
          </span>
        </div>
      </div>
    </div>
  );
}
