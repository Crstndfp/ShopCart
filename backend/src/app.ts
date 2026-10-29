import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { getDbPool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// 1. Middlewares globales                                                                                                                                                                       
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json()); // Parsea el body de JSON a req.body                                                                                                                                    

// 2. Endpoint de Health Check
app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    await pool.request().query('SELECT 1 AS HealthCheck');

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'DISCONNECTED',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use('/api/v1/auth', authRoutes);
export default app;