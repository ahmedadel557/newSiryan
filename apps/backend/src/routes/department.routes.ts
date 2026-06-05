import { Router } from 'express';
import { getDepartmentsByRole } from '../controllers/admin';

const router = Router();

// Public (no-auth) — the staff registration form fetches the departments
// available for the role the applicant selected.
// GET /api/departments/by-role?role=doctor
router.get('/by-role', getDepartmentsByRole);

export default router;
