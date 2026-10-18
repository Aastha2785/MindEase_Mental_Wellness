
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  analyzeJournalTextOnly,
  createJournal,
  getJournals,
  getJournalById,
  analyzeExistingJournal,
} from '../controllers/journal.controller.js';

const router = Router();

router.use(authenticateToken);

// Analyze unsaved text directly from the editor.
router.post('/analyze-text', analyzeJournalTextOnly);

// Save a journal and automatically analyze it.
router.post('/', createJournal);

// Retrieve the logged-in student's journal entries.
router.get('/', getJournals);

// Analyze an already saved journal.
router.post('/:id/analyze', analyzeExistingJournal);

// Retrieve one journal entry.
router.get('/:id', getJournalById);

export default router;
