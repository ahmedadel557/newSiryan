import EmailTemplate from '../models/EmailTemplate';

const DEFAULT_TEMPLATES = [
  {
    name: 'appointment_confirmation',
    subject: 'Appointment Confirmed — {{date}}',
    html_body: `<p>Dear {{patient_name}},</p><p>Your appointment with <strong>Dr. {{doctor_name}}</strong> has been confirmed for <strong>{{date}}</strong> at <strong>{{time}}</strong>.</p><p>Type: {{type}}</p><p>Thank you for choosing Siryan Hospital.</p>`,
  },
  {
    name: 'appointment_reminder',
    subject: 'Reminder: Appointment Tomorrow — {{date}}',
    html_body: `<p>Dear {{patient_name}},</p><p>This is a reminder that you have an appointment with <strong>Dr. {{doctor_name}}</strong> tomorrow, <strong>{{date}}</strong> at <strong>{{time}}</strong>.</p>`,
  },
  {
    name: 'password_reset',
    subject: 'Reset Your Siryan Password',
    html_body: `<p>Dear {{name}},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="{{reset_link}}">Reset Password</a></p><p>If you did not request this, please ignore this email.</p>`,
  },
  {
    name: 'staff_welcome',
    subject: 'Welcome to Siryan Hospital — Your Account Details',
    html_body: `<p>Dear {{first_name}},</p><p>Your Siryan Hospital staff account has been created.</p><p><strong>Username:</strong> {{username}}<br/><strong>Temporary Password:</strong> {{temp_password}}</p><p>Please log in and change your password immediately.</p>`,
  },
  {
    name: 'invoice_ready',
    subject: 'Your Invoice #{{invoice_id}} is Ready',
    html_body: `<p>Dear {{patient_name}},</p><p>Your invoice #<strong>{{invoice_id}}</strong> for <strong>{{total_due}} EGP</strong> is now available. Please visit the cashier or your patient portal to view and pay.</p>`,
  },
  {
    name: 'lab_results_ready',
    subject: 'Your Lab Results Are Ready',
    html_body: `<p>Dear {{patient_name}},</p><p>Your lab results for <strong>{{test_name}}</strong> are now available. Please log in to your patient portal or contact your doctor for details.</p>`,
  },
  {
    name: 'prescription_ready',
    subject: 'Your Prescription is Ready for Pickup',
    html_body: `<p>Dear {{patient_name}},</p><p>Your prescription from <strong>Dr. {{doctor_name}}</strong> dated <strong>{{date}}</strong> is ready for pickup at the pharmacy.</p>`,
  },
];

export const seedEmailTemplates = async () => {
  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      await EmailTemplate.updateOne({ name: tpl.name }, { $setOnInsert: tpl }, { upsert: true });
    }
    console.log('✅ Email templates seeded');
  } catch (err) {
    console.error('Email templates seed error:', err);
  }
};
