
import { Router } from 'express';
import { pool } from '../config/database.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    );

    res.json({
      status: 'connected',
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error('Database connection test failed:', error);

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

export default router;
