import mongoose from 'mongoose';
import Appointment from '../models/Appointment';
import Profile from '../models/Profile';
import VideoCall, { IVideoCall } from '../models/VideoCall';
import DoctorNote, { IDoctorNote } from '../models/DoctorNote';
import { getStreamClient, STREAM_API_KEY } from '../config/stream';
import { emitToUser } from '../config/socket';
import type { DoctorQueueItem, VideoCallToken } from '../types';

/** Build an Error carrying an HTTP status — surfaced by the global errorHandler. */
function apiError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

const CALL_TYPE = 'default';
const TOKEN_VALIDITY_SECONDS = 60 * 60;
const CALL_OPEN_WINDOW_MS = 5 * 60 * 1000; // joinable 5 min before scheduled time

async function getDisplayName(userId: string): Promise<string> {
  const profile = await Profile.findOne({ user: userId }).select('first_name last_name').lean();
  if (!profile) return 'User';
  return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'User';
}

/* ------------------------------------------------------------------ Video */

/** Upsert the user into Stream and return a short-lived user token. */
async function generateStreamToken(userId: string, name?: string): Promise<string> {
  const client = getStreamClient();
  await client.upsertUsers([{ id: userId, role: 'user', name: name ?? undefined }]);
  return client.generateUserToken({ user_id: userId, validity_in_seconds: TOKEN_VALIDITY_SECONDS });
}

/**
 * Doctor opens the room for an online appointment. Validates ownership, type, and
 * the 5-minute join window, ensures the Stream call exists, and upserts the VideoCall doc.
 */
async function getOrCreateVideoCall(
  doctorId: string,
  appointmentId: string,
): Promise<VideoCallToken & { appointment: unknown }> {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw apiError(404, 'Appointment not found');
  if (appt.doctor.toString() !== doctorId) throw apiError(403, 'This appointment is not assigned to you');
  if (appt.type !== 'online') throw apiError(400, 'Video calls are only available for online appointments');
  if (appt.status === 'cancelled') throw apiError(400, 'This appointment has been cancelled');

  if (Date.now() < appt.scheduled_at.getTime() - CALL_OPEN_WINDOW_MS) {
    throw apiError(400, 'The call is not open yet — you can join 5 minutes before the scheduled time');
  }

  const callId = appt._id.toString();
  const patientId = appt.patient.toString();

  const [doctorName, patientName] = await Promise.all([
    getDisplayName(doctorId),
    getDisplayName(patientId),
  ]);

  const client = getStreamClient();
  await client.upsertUsers([
    { id: doctorId, role: 'user', name: doctorName },
    { id: patientId, role: 'user', name: patientName },
  ]);
  await client.video.call(CALL_TYPE, callId).getOrCreate({
    data: {
      created_by_id: doctorId,
      members: [{ user_id: doctorId }, { user_id: patientId }],
    },
  });

  const videoCall = await VideoCall.findOneAndUpdate(
    { appointment: appt._id },
    {
      $setOnInsert: {
        appointment: appt._id,
        call_id: callId,
        doctor: appt.doctor,
        patient: appt.patient,
        started_at: new Date(),
      },
      $set: { status: 'active' },
    },
    { new: true, upsert: true },
  );
  if (!videoCall.started_at) {
    videoCall.started_at = new Date();
    await videoCall.save();
  }

  const token = client.generateUserToken({ user_id: doctorId, validity_in_seconds: TOKEN_VALIDITY_SECONDS });

  // Let the patient know the doctor has opened the room (best-effort).
  try {
    emitToUser(patientId, 'video:call:started', { appointment_id: callId, call_id: callId });
  } catch { /* non-fatal */ }

  return { callId, token, apiKey: STREAM_API_KEY, status: videoCall.status, appointment: appt };
}

/** Doctor ends the call. Marks the VideoCall ended and best-effort ends the Stream call. */
async function endVideoCall(doctorId: string, callId: string): Promise<IVideoCall> {
  const videoCall = await VideoCall.findOne({ call_id: callId, doctor: doctorId });
  if (!videoCall) throw apiError(404, 'Video call not found');

  videoCall.status = 'ended';
  videoCall.ended_at = new Date();
  await videoCall.save();

  try {
    await getStreamClient().video.call(CALL_TYPE, callId).end();
  } catch { /* best-effort — call may already be over */ }

  try {
    emitToUser(videoCall.patient.toString(), 'video:call:ended', { call_id: callId });
  } catch { /* non-fatal */ }

  return videoCall;
}

/**
 * Returns a Stream token for either participant (doctor or patient) of an online
 * appointment, plus the call id and current status.
 */
async function getVideoAccess(userId: string, appointmentId: string): Promise<VideoCallToken> {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw apiError(404, 'Appointment not found');

  const isParticipant = appt.doctor.toString() === userId || appt.patient.toString() === userId;
  if (!isParticipant) throw apiError(403, 'You are not part of this appointment');
  if (appt.type !== 'online') throw apiError(400, 'Video calls are only available for online appointments');

  const callId = appt._id.toString();
  const videoCall = await VideoCall.findOne({ appointment: appt._id }).select('status').lean();
  const token = await generateStreamToken(userId, await getDisplayName(userId));

  return { callId, token, apiKey: STREAM_API_KEY, status: videoCall?.status ?? 'waiting' };
}

/* ------------------------------------------------------------------ Notes */

async function assertDoctorPatientAccess(doctorId: string, patientId: string): Promise<void> {
  const hasAccess = await Appointment.exists({ doctor: doctorId, patient: patientId });
  if (!hasAccess) throw apiError(404, 'Patient not found or not assigned to you');
}

async function createNote(
  doctorId: string,
  data: { patient_id: string; content: string; appointment_id?: string },
): Promise<IDoctorNote> {
  await assertDoctorPatientAccess(doctorId, data.patient_id);
  return DoctorNote.create({
    doctor: doctorId,
    patient: data.patient_id,
    content: data.content,
    appointment: data.appointment_id || undefined,
  });
}

async function getNotes(doctorId: string, patientId: string): Promise<IDoctorNote[]> {
  return DoctorNote.find({ doctor: doctorId, patient: patientId }).sort({ createdAt: -1 });
}

async function updateNote(doctorId: string, noteId: string, content: string): Promise<IDoctorNote> {
  const note = await DoctorNote.findOneAndUpdate(
    { _id: noteId, doctor: doctorId },
    { content },
    { new: true },
  );
  if (!note) throw apiError(404, 'Note not found');
  return note;
}

async function deleteNote(doctorId: string, noteId: string): Promise<{ id: string }> {
  const deleted = await DoctorNote.findOneAndDelete({ _id: noteId, doctor: doctorId });
  if (!deleted) throw apiError(404, 'Note not found');
  return { id: deleted._id.toString() };
}

/* ------------------------------------------------------------------ Queue */

async function getTodayQueue(doctorId: string): Promise<DoctorQueueItem[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const appts = await Appointment.find({
    doctor: new mongoose.Types.ObjectId(doctorId),
    scheduled_at: { $gte: start, $lte: end },
    status: { $ne: 'cancelled' },
  })
    .sort({ scheduled_at: 1 })
    .lean();

  const patientIds = appts.map((a) => a.patient);
  const profiles = await Profile.find({ user: { $in: patientIds } })
    .select('user first_name last_name')
    .lean();
  const nameMap = new Map(
    profiles.map((p) => [
      p.user.toString(),
      `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient',
    ]),
  );

  return appts.map((a) => ({
    appointment_id: a._id.toString(),
    patient_id: a.patient.toString(),
    patient_name: nameMap.get(a.patient.toString()) ?? 'Patient',
    type: a.type,
    status: a.status,
    scheduled_at: a.scheduled_at,
  }));
}

export const doctorService = {
  generateStreamToken,
  getOrCreateVideoCall,
  endVideoCall,
  getVideoAccess,
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  getTodayQueue,
};
