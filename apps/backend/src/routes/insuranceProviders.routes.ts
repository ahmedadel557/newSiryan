// Public endpoint — no auth required (used by patient registration form)
import { Router } from 'express';
import { getInsuranceCompanies } from '../controllers/patient';

const router = Router();

router.get('/', getInsuranceCompanies as any);

export default router;
