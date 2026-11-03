import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';
import { env } from './config/env.js';
import { getDbPool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import cartRoutes from './routes/cart.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import addressRoutes from './routes/address.routes.js';
import orderRoutes from './routes/order.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import configurationRoutes from './routes/configuration.routes.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';

const app = express();

// 1. Middlewares globales
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(requestLogger);

// 2. Swagger UI Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'ShopCart API - Swagger Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// 3. Endpoint de Health Check
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
app.use(`${env.API_PREFIX}/coupons`, couponRoutes);
app.use(`${env.API_PREFIX}/addresses`, addressRoutes);
app.use(`${env.API_PREFIX}/orders`, orderRoutes);
app.use(`${env.API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${env.API_PREFIX}/reports`, reportRoutes);
app.use(`${env.API_PREFIX}/audit`, auditRoutes);
app.use(`${env.API_PREFIX}/configurations`, configurationRoutes);

// 4. Captura de rutas no encontradas (404)
app.use(notFoundHandler);

// 5. Middleware global de errores
app.use(errorHandler);

export default app;
