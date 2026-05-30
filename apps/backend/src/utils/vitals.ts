export interface VitalReading {
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  temperature?: number;
  heart_rate?: number;
  blood_sugar?: number;
  oxygen_level?: number;
  respiratory_rate?: number;
}

export type Severity = 'warning' | 'critical';

export interface Abnormality {
  label: string;
  value: number;
  unit: string;
  severity: Severity;
  message: string;
}

export function detectAbnormalVitals(v: VitalReading): Abnormality[] {
  const out: Abnormality[] = [];

  if (v.heart_rate != null) {
    if (v.heart_rate < 40 || v.heart_rate > 140) {
      out.push({ label: 'HR', value: v.heart_rate, unit: 'bpm', severity: 'critical',
        message: v.heart_rate < 40 ? 'Severe bradycardia' : 'Severe tachycardia' });
    } else if (v.heart_rate < 50 || v.heart_rate > 110) {
      out.push({ label: 'HR', value: v.heart_rate, unit: 'bpm', severity: 'warning',
        message: v.heart_rate < 50 ? 'Bradycardia' : 'Tachycardia' });
    }
  }

  if (v.blood_pressure_sys != null) {
    if (v.blood_pressure_sys < 80 || v.blood_pressure_sys > 180) {
      out.push({ label: 'BP sys', value: v.blood_pressure_sys, unit: 'mmHg', severity: 'critical',
        message: v.blood_pressure_sys < 80 ? 'Severe hypotension' : 'Hypertensive crisis' });
    } else if (v.blood_pressure_sys < 90 || v.blood_pressure_sys > 150) {
      out.push({ label: 'BP sys', value: v.blood_pressure_sys, unit: 'mmHg', severity: 'warning',
        message: v.blood_pressure_sys < 90 ? 'Low blood pressure' : 'High blood pressure' });
    }
  }
  if (v.blood_pressure_dia != null) {
    if (v.blood_pressure_dia < 50 || v.blood_pressure_dia > 120) {
      out.push({ label: 'BP dia', value: v.blood_pressure_dia, unit: 'mmHg', severity: 'critical',
        message: v.blood_pressure_dia < 50 ? 'Severe hypotension' : 'Hypertensive crisis' });
    } else if (v.blood_pressure_dia < 60 || v.blood_pressure_dia > 95) {
      out.push({ label: 'BP dia', value: v.blood_pressure_dia, unit: 'mmHg', severity: 'warning',
        message: v.blood_pressure_dia < 60 ? 'Low diastolic' : 'High diastolic' });
    }
  }

  if (v.temperature != null) {
    if (v.temperature < 35 || v.temperature >= 39.5) {
      out.push({ label: 'Temp', value: v.temperature, unit: '°C', severity: 'critical',
        message: v.temperature < 35 ? 'Hypothermia' : 'High fever' });
    } else if (v.temperature < 36 || v.temperature >= 38) {
      out.push({ label: 'Temp', value: v.temperature, unit: '°C', severity: 'warning',
        message: v.temperature < 36 ? 'Low body temperature' : 'Fever' });
    }
  }

  if (v.oxygen_level != null) {
    if (v.oxygen_level < 88) {
      out.push({ label: 'SpO₂', value: v.oxygen_level, unit: '%', severity: 'critical',
        message: 'Severe hypoxia' });
    } else if (v.oxygen_level < 94) {
      out.push({ label: 'SpO₂', value: v.oxygen_level, unit: '%', severity: 'warning',
        message: 'Low oxygen saturation' });
    }
  }

  if (v.blood_sugar != null) {
    if (v.blood_sugar < 54 || v.blood_sugar > 300) {
      out.push({ label: 'Glucose', value: v.blood_sugar, unit: 'mg/dL', severity: 'critical',
        message: v.blood_sugar < 54 ? 'Severe hypoglycemia' : 'Severe hyperglycemia' });
    } else if (v.blood_sugar < 70 || v.blood_sugar > 200) {
      out.push({ label: 'Glucose', value: v.blood_sugar, unit: 'mg/dL', severity: 'warning',
        message: v.blood_sugar < 70 ? 'Hypoglycemia' : 'Hyperglycemia' });
    }
  }

  if (v.respiratory_rate != null) {
    if (v.respiratory_rate < 8 || v.respiratory_rate > 30) {
      out.push({ label: 'RR', value: v.respiratory_rate, unit: '/min', severity: 'critical',
        message: v.respiratory_rate < 8 ? 'Severe bradypnea' : 'Severe tachypnea' });
    } else if (v.respiratory_rate < 12 || v.respiratory_rate > 22) {
      out.push({ label: 'RR', value: v.respiratory_rate, unit: '/min', severity: 'warning',
        message: v.respiratory_rate < 12 ? 'Bradypnea' : 'Tachypnea' });
    }
  }

  return out;
}

export function topSeverity(items: Abnormality[]): Severity | null {
  if (items.some((i) => i.severity === 'critical')) return 'critical';
  if (items.length > 0) return 'warning';
  return null;
}

export function summarizeAbnormalities(items: Abnormality[]): string {
  return items.map((i) => `${i.label} ${i.value}${i.unit} (${i.message})`).join(', ');
}
