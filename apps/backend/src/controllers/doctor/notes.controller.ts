import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { doctorService } from '../../services/doctor.service';

export const createNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const note = await doctorService.createNote(req.user!.id, req.body);
    sendSuccess(res, note, 'Note created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_note', resource: 'doctor_note', resourceId: note._id.toString(), req });
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const getNotes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notes = await doctorService.getNotes(req.user!.id, req.params.patientId);
    sendSuccess(res, notes);
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const updateNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const note = await doctorService.updateNote(req.user!.id, req.params.noteId, req.body.content);
    sendSuccess(res, note, 'Note updated');
    logAudit({ performedBy: req.user!.id, action: 'update_note', resource: 'doctor_note', resourceId: req.params.noteId, req });
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid note ID', 400);
    next(err);
  }
};

export const deleteNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await doctorService.deleteNote(req.user!.id, req.params.noteId);
    sendSuccess(res, result, 'Note deleted');
    logAudit({ performedBy: req.user!.id, action: 'delete_note', resource: 'doctor_note', resourceId: req.params.noteId, req });
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid note ID', 400);
    next(err);
  }
};
