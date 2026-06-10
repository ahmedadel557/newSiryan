import cron from "node-cron";
import Appointment from "../models/Appointment";
import Notification from "../models/Notification";
import User from "../models/User";
import Profile from "../models/Profile";
import { sendEmail } from "../utils/mailer";
import { emitToUser } from "../config/socket";

type ReminderKind = 24 | 1;

let isRunning = false;

async function doctorDisplayName(doctorId: string): Promise<string> {
  const p = await Profile.findOne({ user: doctorId })
    .select("first_name last_name")
    .lean();

  return p
    ? `Dr. ${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
    : "your doctor";
}

function formatWhen(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendReminder(
  appt: any,
  kind: ReminderKind,
): Promise<void> {
  const scheduledAt = new Date(appt.scheduled_at);

  const whenStr = formatWhen(scheduledAt);

  const doctorName = await doctorDisplayName(
    appt.doctor.toString(),
  );

  const visitType =
    appt.type === "online"
      ? "online consultation"
      : "in-clinic visit";

  const title =
    kind === 24
      ? "Appointment tomorrow"
      : "Appointment in 1 hour";

  const message =
    kind === 24
      ? `Reminder: you have an ${visitType} with ${doctorName} on ${whenStr}.`
      : `Your ${visitType} with ${doctorName} starts at ${whenStr}.`;

  const flagField =
    kind === 24
      ? "reminder_24h_sent"
      : "reminder_1h_sent";

  const claimed = await Appointment.findOneAndUpdate(
    {
      _id: appt._id,
      [flagField]: { $exists: false },
    },
    {
      [flagField]: new Date(),
    },
    {
      new: false,
    },
  );

  if (!claimed) return;

  try {
    const notif = await Notification.create({
      user: appt.patient,
      type: "appointment",
      title,
      message,
      metadata: {
        appointment_id: appt._id.toString(),
        reminder: kind,
        scheduled_at: scheduledAt,
      },
    });

    emitToUser(
      appt.patient.toString(),
      "notification:new",
      notif.toJSON(),
    );
  } catch (err) {
    console.error(
      "Reminder notification error:",
      err,
    );
  }

  try {
    const patient = await User.findById(appt.patient)
      .select("email")
      .lean();

    if (
      patient?.email &&
      process.env.SENDGRID_API_KEY
    ) {
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; padding: 16px; color: #111;">
          <h2 style="margin: 0 0 8px;">${title}</h2>
          <p style="margin: 0 0 12px; line-height: 1.5;">${message}</p>
          ${
            appt.reason
              ? `<p style="margin: 0 0 4px; color: #555;"><strong>Reason:</strong> ${appt.reason}</p>`
              : ""
          }
          <p style="margin: 12px 0 0; color: #888; font-size: 12px;">
            Siryan Hospital
          </p>
        </div>
      `;

      await sendEmail(
        patient.email,
        `Siryan — ${title}`,
        html,
      );
    }
  } catch (err) {
    console.error(
      "Reminder email error:",
      err,
    );
  }
}

const runAppointmentReminders =
  async (): Promise<void> => {
    if (isRunning) return;

    isRunning = true;

    try {
      const now = new Date();

      const horizon = new Date(
        now.getTime() +
          25 * 60 * 60 * 1000,
      );

      const appts = await Appointment.find({
        scheduled_at: {
          $gt: now,
          $lte: horizon,
        },
        status: {
          $in: ["pending", "confirmed"],
        },
      })
        .select(
          "patient doctor scheduled_at type reason reminder_24h_sent reminder_1h_sent",
        )
        .lean();

      let sent24 = 0;
      let sent1 = 0;

      for (const a of appts as any[]) {
        const diffMs =
          new Date(a.scheduled_at).getTime() -
          now.getTime();

        const diffH = diffMs / 3_600_000;

        if (
          diffH > 0 &&
          diffH <= 1 &&
          !a.reminder_1h_sent
        ) {
          await sendReminder(a, 1);
          sent1++;
          continue;
        }

        if (
          diffH > 1 &&
          diffH <= 24 &&
          !a.reminder_24h_sent
        ) {
          await sendReminder(a, 24);
          sent24++;
        }
      }

      if (sent24 || sent1) {
        console.log(
          `Appointment reminders sent — 24h: ${sent24}, 1h: ${sent1}`,
        );
      }
    } catch (err) {
      console.error(
        "Appointment reminder job error:",
        err,
      );
    } finally {
      isRunning = false;
    }
  };

let _started = false;
export const getAppointmentReminderJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startAppointmentReminderJob = () => {
  _started = true;
  const task = cron.schedule(
    "*/5 * * * *",
    () => runAppointmentReminders(),
    {
      timezone: "Africa/Cairo",
    },
  );

  setTimeout(() => {
    runAppointmentReminders().catch(
      console.error,
    );
  }, 5000);

  console.log(
    "Appointment reminder job started",
  );

  return task;
};