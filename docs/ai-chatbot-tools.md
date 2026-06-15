# AI Chatbot Tool Catalog — Siryan Patient API

**Audience:** External team building the custom AI model's tool-calling layer.  
**Source of truth:** `apps/backend/src/routes/patient.routes.ts` and sibling controllers verified on 2026-06-15.

---

## Execution Classes

Every tool below belongs to exactly one execution class:

| Class | Behaviour |
|---|---|
| `direct_with_confirmation` | The AI **must** present a human-readable summary of what it is about to do (doctor name, date/time, cost, etc.) and receive explicit user approval **before** making the HTTP call. Booking, cancellation, and payment actions always require this. |
| `read_only` | The AI may call freely with no prior confirmation. Data is never mutated. |
| `request_from_doctor` | The AI never executes the action directly on the patient's behalf. It creates a structured request routed to clinical staff (pharmacist, doctor). The patient is informed that a staff member will review and action the request. |

---

## Base URL

All paths below are relative to the backend base: `https://<host>/api`

**Auth:** All patient endpoints require a valid `access_token` HttpOnly cookie (`authenticate` middleware). Additional guards where noted.

---

## 1. Appointments

### `get_my_appointments`

**Description:** Fetch the authenticated patient's appointment list (past and upcoming). Call this whenever the user asks to see their schedule, upcoming visits, or appointment history.

**Execution class:** `read_only`

**HTTP:** `GET /patient/appointments`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "confirmed", "cancelled", "completed", "rescheduled", "checked_in", "in_progress"],
      "description": "Filter by appointment status (optional)"
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  }
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id":             { "type": "string" },
              "visit_type":     { "type": "string", "enum": ["physical", "online"] },
              "scheduled_at":   { "type": "string", "format": "date-time" },
              "status":         { "type": "string" },
              "reason":         { "type": "string" },
              "cancel_reason":  { "type": "string" },
              "fee":            { "type": "number" },
              "invoice_id":     { "type": "string" },
              "payment_status": { "type": "string", "enum": ["unpaid", "paid", "partially_paid", "cancelled"] },
              "my_rating":      { "type": ["number", "null"] },
              "follow_up_of":   { "type": "string" },
              "doctor": {
                "type": "object",
                "properties": {
                  "id":             { "type": "string" },
                  "first_name":     { "type": "string" },
                  "last_name":      { "type": "string" },
                  "specialization": { "type": "string" },
                  "department":     { "type": "string" },
                  "avatar_url":     { "type": "string" }
                }
              }
            }
          }
        },
        "total":       { "type": "integer" },
        "page":        { "type": "integer" },
        "limit":       { "type": "integer" },
        "total_pages": { "type": "integer" }
      }
    }
  }
}
```

---

### `get_appointment_detail`

**Description:** Fetch a single appointment by ID, including doctor details. Call when the user asks about a specific visit.

**Execution class:** `read_only`

**HTTP:** `GET /patient/appointments/:id`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Appointment document ID (path param)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "object",
      "properties": {
        "id":           { "type": "string" },
        "visit_type":   { "type": "string", "enum": ["physical", "online"] },
        "scheduled_at": { "type": "string", "format": "date-time" },
        "status":       { "type": "string" },
        "reason":       { "type": "string" },
        "fee":          { "type": "number" },
        "doctor_name":  { "type": "string" },
        "doctor": {
          "type": "object",
          "properties": {
            "id":             { "type": "string" },
            "first_name":     { "type": "string" },
            "last_name":      { "type": "string" },
            "specialization": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

### `get_available_slots`

**Description:** Get available appointment time slots for a specific doctor on a given date. Call before booking to let the user choose a time.

**Execution class:** `read_only`

**HTTP:** `GET /doctor/:id/availability`

**Auth/Role:** `authenticate → authorize('patient', 'doctor', 'receptionist', 'admin')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id":   { "type": "string", "description": "Doctor user ID (path param)" },
    "date": { "type": "string", "format": "date", "description": "YYYY-MM-DD (query param; defaults to today)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "object",
      "properties": {
        "date":            { "type": "string", "format": "date" },
        "available_slots": {
          "type": "array",
          "items": { "type": "string", "description": "ISO date-time string for each free slot" }
        },
        "booked_slots": {
          "type": "array",
          "items": { "type": "string" }
        },
        "all_slots": {
          "type": "array",
          "items": { "type": "string" }
        },
        "blocked":        { "type": "boolean" },
        "blocked_reason": { "type": "string" }
      }
    }
  }
}
```

---

### `get_doctor_list`

**Description:** List active doctors, optionally filtered by department or specialization. Call when the user wants to find a doctor to book with.

**Execution class:** `read_only`

**HTTP:** `GET /doctor/list`

**Auth/Role:** `authenticate → authorize('patient', 'doctor', 'receptionist', 'admin')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "department":     { "type": "string", "description": "Filter by department name" },
    "specialization": { "type": "string", "description": "Filter by specialization" }
  }
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":             { "type": "string" },
          "name":           { "type": "string" },
          "specialization": { "type": "string" },
          "department":     { "type": "string" },
          "avatar_url":     { "type": ["string", "null"] },
          "shift":          { "type": ["string", "null"] },
          "rating_avg":     { "type": ["number", "null"] },
          "rating_count":   { "type": "integer" }
        }
      }
    }
  }
}
```

---

### `book_appointment`

**Description:** Book a new appointment with a specific doctor. **Requires confirmation** — show the user the doctor name, visit type, date/time, and consultation fee before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/appointments`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient') → requireEmailVerified`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "doctor_id":    { "type": "string", "description": "Doctor user ID" },
    "type":         { "type": "string", "enum": ["physical", "online"], "default": "physical" },
    "scheduled_at": { "type": "string", "format": "date-time", "description": "Must be in the future" },
    "reason":       { "type": "string", "description": "Reason for the visit (optional)" }
  },
  "required": ["doctor_id", "scheduled_at"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "appointment": {
          "type": "object",
          "properties": {
            "id":           { "type": "string" },
            "type":         { "type": "string" },
            "scheduled_at": { "type": "string", "format": "date-time" },
            "status":       { "type": "string" },
            "fee":          { "type": "number" },
            "invoice":      { "type": "string" }
          }
        },
        "invoice": {
          "type": "object",
          "properties": {
            "id":         { "type": "string" },
            "total_due":  { "type": "number" },
            "status":     { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

### `cancel_appointment`

**Description:** Cancel a pending or confirmed appointment. **Requires confirmation** — show appointment date/doctor name and warn that cancellations within 24 hours of the appointment are blocked. Do not call if the appointment is already completed or cancelled.

**Execution class:** `direct_with_confirmation`

**HTTP:** `DELETE /patient/appointments/:id`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id":            { "type": "string", "description": "Appointment ID (path param)" },
    "cancel_reason": { "type": "string", "description": "Reason for cancellation (optional, body)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "description": "Updated Appointment document",
      "properties": {
        "id":            { "type": "string" },
        "status":        { "type": "string", "enum": ["cancelled"] },
        "cancel_reason": { "type": "string" }
      }
    }
  }
}
```

---

### `get_waiting_estimate`

**Description:** Get the estimated waiting time before an appointment starts, based on queue position and historical visit durations.

**Execution class:** `read_only`

**HTTP:** `GET /patient/appointments/:id/waiting-estimate`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Appointment ID (path param)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "object",
      "properties": {
        "patients_ahead":    { "type": "integer" },
        "avg_minutes":       { "type": "integer", "description": "Average minutes per patient (10–60)" },
        "estimated_minutes": { "type": "integer" },
        "status":            { "type": "string" }
      }
    }
  }
}
```

---

## 2. Medical Records

### `view_medical_records`

**Description:** Retrieve all medical records for the authenticated patient, including diagnoses, prescriptions, lab orders, and radiology orders. Call when the user asks about their health history, past diagnoses, or visit summaries.

**Execution class:** `read_only`

**HTTP:** `GET /patient/medical-record`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":           { "type": "string" },
          "diagnosis":    { "type": "string" },
          "notes":        { "type": "string" },
          "createdAt":    { "type": "string", "format": "date-time" },
          "vital_signs": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "blood_pressure_sys": { "type": "number" },
                "blood_pressure_dia": { "type": "number" },
                "temperature":        { "type": "number" },
                "heart_rate":         { "type": "number" },
                "blood_sugar":        { "type": "number" },
                "oxygen_level":       { "type": "number" },
                "recorded_at":        { "type": "string", "format": "date-time" }
              }
            }
          },
          "prescriptions":    { "type": "array", "description": "Populated Prescription documents" },
          "lab_orders":       { "type": "array", "description": "Populated LabOrder documents" },
          "radiology_orders": { "type": "array", "description": "Populated RadiologyOrder documents" },
          "appointment":      { "type": "object", "description": "Populated Appointment document" },
          "doctor": {
            "type": "object",
            "properties": {
              "id":             { "type": "string" },
              "first_name":     { "type": "string" },
              "last_name":      { "type": "string" },
              "specialization": { "type": "string" },
              "department":     { "type": "string" },
              "avatar_url":     { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Billing

### `view_invoices`

**Description:** Retrieve all invoices for the authenticated patient (appointment, pharmacy, room, lab, radiology). Call when the user asks about their bills, outstanding payments, or payment history.

**Execution class:** `read_only`

**HTTP:** `GET /patient/invoices`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":                 { "type": "string" },
          "subtotal":           { "type": "number" },
          "insurance_coverage": { "type": "number" },
          "total_due":          { "type": "number" },
          "amount_paid":        { "type": "number" },
          "status":             { "type": "string", "enum": ["unpaid", "paid", "partially_paid", "cancelled"] },
          "payment_method":     { "type": "string", "enum": ["cash", "card", "insurance", "mixed"] },
          "insurance_provider": { "type": "string" },
          "paid_at":            { "type": "string", "format": "date-time" },
          "notes":              { "type": "string" },
          "appointment":        { "type": "string", "description": "Appointment ID if applicable" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "description": { "type": "string" },
                "category":    { "type": "string", "enum": ["appointment", "pharmacy", "room", "lab", "radiology", "other"] },
                "amount":      { "type": "number" }
              }
            }
          },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

### `get_payment_link`

**Description:** Trigger a mock card payment for an appointment invoice (marks invoice as paid, confirms appointment). **Requires confirmation** — show the amount due before calling. This is the current mock payment flow; a real payment gateway integration will replace this.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/appointments/:id/pay-mock`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id":     { "type": "string", "description": "Appointment ID (path param)" },
    "method": { "type": "string", "enum": ["card", "vodafone_cash", "fawry", "instapay"], "description": "Payment method (body)" }
  },
  "required": ["id", "method"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "appointment": {
          "type": "object",
          "properties": {
            "id":     { "type": "string" },
            "status": { "type": "string" }
          }
        },
        "invoice": {
          "type": "object",
          "properties": {
            "id":             { "type": "string" },
            "status":         { "type": "string", "enum": ["paid"] },
            "payment_method": { "type": "string" },
            "paid_at":        { "type": "string", "format": "date-time" }
          }
        }
      }
    }
  }
}
```

---

## 4. Pharmacy

### `view_prescriptions`

**Description:** List all prescriptions issued to the patient, including medication details, dosage, and status. Call when the user asks about their medications or active prescriptions.

**Execution class:** `read_only`

**HTTP:** `GET /patient/prescriptions`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":         { "type": "string" },
          "status":     { "type": "string", "enum": ["active", "dispensed", "expired", "cancelled"] },
          "expires_at": { "type": "string", "format": "date-time" },
          "max_refills": { "type": "integer" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "medication": {
                  "type": "object",
                  "properties": {
                    "id":                    { "type": "string" },
                    "name":                  { "type": "string" },
                    "unit":                  { "type": "string" },
                    "category":              { "type": "string" },
                    "requires_prescription": { "type": "boolean" }
                  }
                },
                "dosage":         { "type": "string" },
                "frequency":      { "type": "string" },
                "duration_days":  { "type": "integer" },
                "instructions":   { "type": "string" }
              }
            }
          },
          "doctor": {
            "type": "object",
            "properties": {
              "username": { "type": "string" },
              "email":    { "type": "string" }
            }
          },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

### `view_pharmacy_orders`

**Description:** List all OTC and prescription pharmacy orders placed by the patient. Call when the user asks about their pharmacy orders or medication deliveries.

**Execution class:** `read_only`

**HTTP:** `GET /patient/pharmacy/orders`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":            { "type": "string" },
          "status":        { "type": "string" },
          "delivery_type": { "type": "string", "enum": ["pickup", "delivery"] },
          "total_amount":  { "type": "number" },
          "invoice":       { "type": "string" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "medication": {
                  "type": "object",
                  "properties": {
                    "id":       { "type": "string" },
                    "name":     { "type": "string" },
                    "unit":     { "type": "string" },
                    "category": { "type": "string" },
                    "price":    { "type": "number" }
                  }
                },
                "quantity": { "type": "integer" },
                "price":    { "type": "number" }
              }
            }
          },
          "prescription": { "type": "object", "description": "Populated Prescription document if applicable" },
          "createdAt":    { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

### `create_pharmacy_order`

**Description:** Place a pharmacy order for one or more medications. Prescription-only medications require a valid active `prescription_id`. **Requires confirmation** — show item names, quantities, and estimated cost before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/pharmacy/order`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient') → requireEmailVerified`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "medication_id": { "type": "string" },
          "quantity":      { "type": "integer", "minimum": 1 }
        },
        "required": ["medication_id", "quantity"]
      }
    },
    "delivery_type":   { "type": "string", "enum": ["pickup", "delivery"], "default": "pickup" },
    "prescription_id": { "type": "string", "description": "Required if any medication requires a prescription" }
  },
  "required": ["items"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "order": {
          "type": "object",
          "properties": {
            "id":           { "type": "string" },
            "status":       { "type": "string" },
            "total_amount": { "type": "number" },
            "invoice":      { "type": "string" }
          }
        },
        "invoice": {
          "type": "object",
          "properties": {
            "id":                 { "type": "string" },
            "total_due":          { "type": "number" },
            "insurance_coverage": { "type": "number" },
            "status":             { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

### `request_prescription_refill`

**Description:** Submit a refill request for a previously dispensed/approved prescription order. The pharmacist reviews and approves it — the AI does **not** dispense medications directly. Silently creates the request and tells the user that staff will review it.

**Execution class:** `request_from_doctor`

**HTTP:** `POST /pharmacy/refill-request`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "original_order_id": {
      "type": "string",
      "description": "ID of the previously approved or dispensed PharmacyOrder"
    }
  },
  "required": ["original_order_id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "id":                    { "type": "string" },
        "status":                { "type": "string", "enum": ["pending"] },
        "original_prescription": { "type": "string" },
        "original_order":        { "type": "string" },
        "createdAt":             { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

## 5. Rooms

### `get_available_rooms`

**Description:** List all hospital rooms, optionally filtered by type or availability status. Call when the user wants to know what rooms are available for admission.

**Execution class:** `read_only`

**HTTP:** `GET /inventory/rooms`

**Auth/Role:** `authenticate → authorize('inventory_manager', 'admin', 'patient', 'doctor')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "type":   { "type": "string", "enum": ["operation", "icu", "radiology", "general"], "description": "Filter by room type (query param)" },
    "status": { "type": "string", "enum": ["available", "occupied", "maintenance"], "description": "Filter by status (query param)" }
  }
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":                { "type": "string" },
          "name":              { "type": "string" },
          "type":              { "type": "string", "enum": ["operation", "icu", "radiology", "general"] },
          "status":            { "type": "string", "enum": ["available", "occupied", "maintenance"] },
          "floor":             { "type": "integer" },
          "capacity":          { "type": "integer" },
          "current_occupancy": { "type": "integer" },
          "price_per_day":     { "type": "number" },
          "available_beds":    { "type": "integer", "description": "Virtual: capacity - current_occupancy" },
          "is_full":           { "type": "boolean" }
        }
      }
    }
  }
}
```

---

### `book_room`

**Description:** Request a room booking for inpatient admission, linked to a specific doctor. **Requires confirmation** — show room name, type, price per day, check-in date, and assigned doctor before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/rooms/book`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient') → requireEmailVerified`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "room_id":   { "type": "string", "description": "Room document ID" },
    "doctor_id": { "type": "string", "description": "Attending doctor user ID" },
    "check_in":  { "type": "string", "format": "date-time" },
    "check_out": { "type": "string", "format": "date-time", "description": "Optional discharge date" }
  },
  "required": ["room_id", "doctor_id", "check_in"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "id":        { "type": "string" },
        "room":      { "type": "string" },
        "doctor":    { "type": "string" },
        "check_in":  { "type": "string", "format": "date-time" },
        "check_out": { "type": "string", "format": "date-time" },
        "status":    { "type": "string", "enum": ["active"] }
      }
    }
  }
}
```

---

### `view_room_bookings`

**Description:** List all current and past room bookings for the patient. Call when the user asks about their admission status or hospital stay history.

**Execution class:** `read_only`

**HTTP:** `GET /patient/rooms/bookings`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":          { "type": "string" },
          "status":      { "type": "string", "enum": ["requested", "active", "completed", "cancelled"] },
          "check_in":    { "type": "string", "format": "date-time" },
          "check_out":   { "type": "string", "format": "date-time" },
          "total_cost":  { "type": "number" },
          "doctor_notes":{ "type": "string" },
          "room": {
            "type": "object",
            "properties": {
              "id":            { "type": "string" },
              "name":          { "type": "string" },
              "type":          { "type": "string" },
              "floor":         { "type": "integer" },
              "price_per_day": { "type": "number" },
              "status":        { "type": "string" }
            }
          },
          "doctor": {
            "type": "object",
            "properties": {
              "username": { "type": "string" },
              "email":    { "type": "string" }
            }
          },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

### `cancel_room_booking`

**Description:** Cancel a room booking. **Requires confirmation** — show room name and check-in date before calling. Cannot cancel a completed booking.

**Execution class:** `direct_with_confirmation`

**HTTP:** `DELETE /patient/rooms/bookings/:id`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "RoomBooking document ID (path param)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "id":     { "type": "string" },
        "status": { "type": "string", "enum": ["cancelled"] }
      }
    }
  }
}
```

---

## 6. Lab / Radiology

### `view_lab_results`

**Description:** Retrieve all lab orders and their results for the patient. Call when the user asks about blood tests, lab reports, or test results.

**Execution class:** `read_only`

**HTTP:** `GET /patient/lab-results`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":           { "type": "string" },
          "test_name":    { "type": "string" },
          "status":       { "type": "string", "enum": ["pending", "scheduled", "in_progress", "completed", "cancelled"] },
          "priority":     { "type": "string", "enum": ["routine", "urgent", "stat"] },
          "results":      { "type": "string", "description": "Text summary of findings" },
          "file_url":     { "type": "string", "description": "URL to result attachment" },
          "notes":        { "type": "string" },
          "ordered_at":   { "type": "string", "format": "date-time" },
          "scheduled_at": { "type": "string", "format": "date-time" },
          "completed_at": { "type": "string", "format": "date-time" },
          "doctor": {
            "type": "object",
            "properties": {
              "username": { "type": "string" },
              "email":    { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

---

### `schedule_lab_visit`

**Description:** Schedule the date/time for a lab visit for a pending lab order. The order must already exist (ordered by a doctor). **Requires confirmation** — show the test name and proposed date before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/lab-orders/:id/schedule`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id":           { "type": "string", "description": "LabOrder ID (path param)" },
    "scheduled_at": { "type": "string", "format": "date-time", "description": "Desired visit date/time (body)" }
  },
  "required": ["id", "scheduled_at"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "id":           { "type": "string" },
        "test_name":    { "type": "string" },
        "status":       { "type": "string", "enum": ["scheduled"] },
        "scheduled_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

### `view_radiology_results`

**Description:** Retrieve all radiology (scan/imaging) orders and their findings for the patient. Call when the user asks about X-rays, MRIs, CT scans, or imaging results.

**Execution class:** `read_only`

**HTTP:** `GET /patient/radiology-results`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":           { "type": "string" },
          "scan_type":    { "type": "string", "description": "e.g. Chest X-Ray, Brain MRI" },
          "status":       { "type": "string", "enum": ["pending", "scheduled", "in_progress", "completed", "cancelled"] },
          "priority":     { "type": "string", "enum": ["routine", "urgent", "stat"] },
          "findings":     { "type": "string", "description": "Radiologist's findings text" },
          "file_url":     { "type": "string", "description": "URL to image/report attachment" },
          "notes":        { "type": "string" },
          "ordered_at":   { "type": "string", "format": "date-time" },
          "scheduled_at": { "type": "string", "format": "date-time" },
          "completed_at": { "type": "string", "format": "date-time" },
          "doctor": {
            "type": "object",
            "properties": {
              "username": { "type": "string" },
              "email":    { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

---

### `schedule_radiology_visit`

**Description:** Schedule the date/time for a radiology visit for a pending scan order. The order must already exist (ordered by a doctor). **Requires confirmation** — show the scan type and proposed date before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `POST /patient/radiology-orders/:id/schedule`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id":           { "type": "string", "description": "RadiologyOrder ID (path param)" },
    "scheduled_at": { "type": "string", "format": "date-time", "description": "Desired visit date/time (body)" }
  },
  "required": ["id", "scheduled_at"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "id":           { "type": "string" },
        "scan_type":    { "type": "string" },
        "status":       { "type": "string", "enum": ["scheduled"] },
        "scheduled_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

## 7. Notifications

### `get_notifications`

**Description:** Retrieve the patient's 50 most recent notifications (appointments, lab results, pharmacy updates, etc.). Call when the user asks what's new or wants to see alerts.

**Execution class:** `read_only`

**HTTP:** `GET /patient/notifications`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":         { "type": "string" },
          "type":       { "type": "string", "enum": ["appointment", "prescription", "lab", "radiology", "pharmacy", "inventory", "emergency", "general", "room"] },
          "title":      { "type": "string" },
          "message":    { "type": "string" },
          "is_read":    { "type": "boolean" },
          "metadata":   { "type": "object", "description": "Context-specific key/value pairs" },
          "created_at": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

### `mark_notification_read`

**Description:** Mark a single notification as read. Call after the user acknowledges a specific alert.

**Execution class:** `read_only`

**HTTP:** `PATCH /patient/notifications/:id/read`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Notification ID (path param)" }
  },
  "required": ["id"]
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data":    { "type": "null" }
  }
}
```

---

### `mark_all_notifications_read`

**Description:** Mark all the patient's notifications as read at once.

**Execution class:** `read_only`

**HTTP:** `PATCH /patient/notifications/read-all`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data":    { "type": "null" }
  }
}
```

---

## 8. Profile

### `view_profile`

**Description:** Retrieve the authenticated patient's full profile including demographics, insurance, allergies, and chronic conditions. Call when the user asks to see their personal information or health profile.

**Execution class:** `read_only`

**HTTP:** `GET /patient/profile`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "object",
      "properties": {
        "id":                      { "type": "string" },
        "first_name":              { "type": "string" },
        "last_name":               { "type": "string" },
        "phone":                   { "type": "string" },
        "avatar_url":              { "type": "string" },
        "date_of_birth":           { "type": "string", "format": "date" },
        "gender":                  { "type": "string", "enum": ["male", "female", ""] },
        "blood_type":              { "type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""] },
        "address":                 { "type": "string" },
        "national_id":             { "type": "string" },
        "emergency_contact_name":  { "type": "string" },
        "emergency_contact_phone": { "type": "string" },
        "insurance_provider":      { "type": "string" },
        "insurance_number":        { "type": "string" },
        "insurance_discount_pct":  { "type": "number", "description": "0–1 fraction; multiply by 100 for percentage" },
        "allergies":               { "type": "array", "items": { "type": "string" } },
        "chronic_conditions":      { "type": "array", "items": { "type": "string" } },
        "user": {
          "type": "object",
          "properties": {
            "username": { "type": "string" },
            "email":    { "type": "string" },
            "role":     { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

### `update_profile`

**Description:** Update one or more fields of the patient's profile. **Do not call without showing the user what will change.** Treat as `direct_with_confirmation` — summarize the proposed changes before calling.

**Execution class:** `direct_with_confirmation`

**HTTP:** `PUT /patient/profile`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:**

```json
{
  "type": "object",
  "properties": {
    "first_name":              { "type": "string" },
    "last_name":               { "type": "string" },
    "date_of_birth":           { "type": "string", "format": "date" },
    "gender":                  { "type": "string", "enum": ["male", "female"] },
    "blood_type":              { "type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    "phone":                   { "type": "string" },
    "address":                 { "type": "string" },
    "insurance_provider":      { "type": "string" },
    "insurance_number":        { "type": "string" },
    "national_id":             { "type": "string" },
    "emergency_contact_name":  { "type": "string" },
    "emergency_contact_phone": { "type": "string" },
    "allergies":               { "type": "array", "items": { "type": "string" } },
    "chronic_conditions":      { "type": "array", "items": { "type": "string" } }
  }
}
```

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "description": "Full updated Profile document (same shape as view_profile response data)"
    }
  }
}
```

---

## 9. Supplementary / Lookup

### `get_insurance_companies`

**Description:** List active insurance providers the hospital accepts. Call when the user wants to know which insurers are supported before updating their profile.

**Execution class:** `read_only`

**HTTP:** `GET /patient/insurance-companies`

**Auth/Role:** `authenticate → requireCompleteProfile → authorize('patient')`

**Request parameters:** *(none)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":                  { "type": "string" },
          "name":                { "type": "string" },
          "discount_percentage": { "type": "number", "description": "0–100 integer percentage" },
          "covered_services":    { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

---

### `get_available_medications`

**Description:** List medications available at the pharmacy. Call when the user wants to browse or order medications.

**Execution class:** `read_only`

**HTTP:** `GET /pharmacy/medications`

**Auth/Role:** `authenticate → authorize('patient', 'pharmacist', 'admin', 'doctor', 'nurse')`

**Request parameters:** *(none — no query filters are documented at the route level)*

**Response shape:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":                    { "type": "string" },
          "name":                  { "type": "string" },
          "unit":                  { "type": "string" },
          "category":              { "type": "string" },
          "price":                 { "type": "number" },
          "requires_prescription": { "type": "boolean" },
          "stock_quantity":        { "type": "integer" }
        }
      }
    }
  }
}
```

---

## Gaps — Endpoints Needed but Not Yet Implemented

The following tools were listed as desirable in the chatbot tool spec but have **no existing backend route** to back them. Do not fabricate paths for these — they must be built before the AI can call them.

| Desired tool | Gap description |
|---|---|
| `create_assistance_request` | No patient-facing endpoint exists to create a staff assistance / nurse call request. The `EmergencyFlag` model is nurse-only; there is no equivalent patient → nurse/receptionist request model or route. |
| `rate_appointment` | The route `POST /patient/appointments/:id/rate` exists and works, but the current chatbot spec did not include it in the tool list. It is implemented and can be added as a `direct_with_confirmation` tool (body: `{ stars: 1–5, feedback?: string }`; only callable after appointment status = `completed`). |
| `view_medical_record_shares` | `GET /patient/medical-record-shares` and `DELETE /patient/medical-record-shares/:id` exist for sharing with doctors but are not listed in the original tool spec. They can be surfaced as supplementary tools if sharing is a chatbot flow. |
| `request_new_lab_order` | The AI **cannot** order a new lab test on behalf of the patient. Only doctors can (`POST /doctor/patients/:id/lab-order`). If the patient wants a new test, the AI should advise them to contact their doctor. |
| `request_new_radiology_order` | Same as above — doctor-only (`POST /doctor/patients/:id/radiology-order`). |
| `request_treatment_change` | No direct endpoint. Patient must contact their doctor through an appointment. |
| Real payment gateway (`get_payment_link` redirect) | The current `POST /patient/appointments/:id/pay-mock` is a mock. A real payment integration (Fawry, Stripe, etc.) needs a separate endpoint that returns a redirect URL or payment token before this tool can be used in production. |
