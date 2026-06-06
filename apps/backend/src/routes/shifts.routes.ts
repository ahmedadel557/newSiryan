// Public endpoint — list active shift definitions (no auth required)
import { Router } from 'express';
import { listActiveShiftDefinitions } from '../controllers/admin/shiftDefinition.controller';

const router = Router();

router.get('/', listActiveShiftDefinitions);

export default router;
