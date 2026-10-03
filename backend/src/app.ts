import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index.js';
import { swaggerDocument } from './docs/swaggerSpec.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiGlobalLimiter } from './middleware/rateLimiter.js';
import { incrementRequestCounter } from './controllers/systemController.js';
import { ENV } from './config/env.js';

export function createExpressApp(): express.Application {
  const app = express();

  // 1. Security Headers via Helmet (OWASP Requirement)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", '*'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // 3. Body parsers with payload limit protection
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 4. Global metrics increment
  app.use((_req, _res, next) => {
    incrementRequestCounter();
    next();
  });

  // 5. Global API Rate Limiter
  app.use('/api/', apiGlobalLimiter);

  // 6. Swagger Documentation endpoints
  app.get('/api/docs/json', (_req, res) => {
    res.json(swaggerDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Course Platform REST API Documentation',
  }));

  // 7. Mount Core API v1 routes
  app.use('/api/v1', apiRoutes);

  // 8. Global Error Handler (OWASP generic errors in production)
  app.use(errorHandler);

  return app;
}
