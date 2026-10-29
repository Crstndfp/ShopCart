import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { getDbPool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import cartRoutes from './routes/cart.routes.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// 1. Middlewares globales
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

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

// 3. Rutas de la API
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/catalog`, catalogRoutes);
app.use(`${env.API_PREFIX}/cart`, cartRoutes);

// 4. Captura de rutas no encontradas (404)
app.use(notFoundHandler);

// 5. Middleware global de errores
app.use(errorHandler);

export default app;
