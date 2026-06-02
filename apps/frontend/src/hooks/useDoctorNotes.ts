'use client';
import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';
import { useToast } from './useToast';
import type { DoctorNote } from '@/types';

export function useDoctorNotes(patientId: string) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<DoctorNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    doctorService
      .getNotes(patientId)
      .then((data) => { if (!cancelled) setNotes(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  const createNote = useCallback(
    async (content: string, appointmentId?: string) => {
      setSaving(true);
      try {
        const note = await doctorService.createNote({ patient_id: patientId, content, appointment_id: appointmentId });
        setNotes((prev) => [note, ...prev]);
        showToast('Note added', 'success');
      } catch {
        showToast('Failed to add note', 'error');
      } finally {
        setSaving(false);
      }
    },
    [patientId, showToast],
  );

  const updateNote = useCallback(
    async (noteId: string, content: string) => {
      setSaving(true);
      try {
        const updated = await doctorService.updateNote(noteId, { content });
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
        showToast('Note updated', 'success');
      } catch {
        showToast('Failed to update note', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showToast],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const prev = notes;
      setNotes((cur) => cur.filter((n) => n.id !== noteId));
      try {
        await doctorService.deleteNote(noteId);
        showToast('Note deleted', 'success');
      } catch {
        setNotes(prev);
        showToast('Failed to delete note', 'error');
      }
    },
    [notes, showToast],
  );

  return { notes, isLoading, createNote, updateNote, deleteNote, saving };
}
