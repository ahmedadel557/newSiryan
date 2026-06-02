'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useToast } from '@/hooks/shared';
import type { DoctorNote } from '@/types';

export function useDoctorNotes(patientId: string) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.doctorNotes(patientId);

  const { data: notes = [], isPending } = useQuery({
    queryKey: key,
    queryFn: () => doctorService.getNotes(patientId),
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: (vars: { content: string; appointmentId?: string }) =>
      doctorService.createNote({ patient_id: patientId, content: vars.content, appointment_id: vars.appointmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      showToast('Note added', 'success');
    },
    onError: () => showToast('Failed to add note', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { noteId: string; content: string }) =>
      doctorService.updateNote(vars.noteId, { content: vars.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      showToast('Note updated', 'success');
    },
    onError: () => showToast('Failed to update note', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => doctorService.deleteNote(noteId),
    onMutate: (noteId) => {
      const previous = queryClient.getQueryData<DoctorNote[]>(key);
      queryClient.setQueryData<DoctorNote[]>(key, (prev) => (prev ?? []).filter((n) => n.id !== noteId));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      showToast('Failed to delete note', 'error');
    },
    onSuccess: () => showToast('Note deleted', 'success'),
  });

  const createNote = (content: string, appointmentId?: string) =>
    createMutation.mutateAsync({ content, appointmentId });
  const updateNote = (noteId: string, content: string) =>
    updateMutation.mutateAsync({ noteId, content });
  const deleteNote = (noteId: string) => deleteMutation.mutateAsync(noteId);

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return { notes, isLoading: isPending, createNote, updateNote, deleteNote, saving };
}
