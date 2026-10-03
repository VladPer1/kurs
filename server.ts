import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './backend/src/app.js';
import { seedDatabase } from './backend/src/services/seedService.js';
import { logger } from './backend/src/config/logger.js';
import { ENV } from './backend/src/config/env.js';

async function startServer() {
  try {
    // 1. Initialize DB and run initial seed
    logger.info('Initializing database and running migrations/seeds...');
    await seedDatabase();

    // 2. Setup Express application
    const app = createExpressApp();

    // Endpoint for direct download of Postman collection
    app.get('/api/postman-collection', (_req, res) => {
      const postmanFilePath = path.resolve(process.cwd(), 'postman', 'course_management_api.json');
      if (fs.existsSync(postmanFilePath)) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="course_management_api.json"');
        res.sendFile(postmanFilePath);
      } else {
        res.status(404).json({ error: 'Postman collection file not found.' });
      }
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const port = ENV.PORT || 3000;

    // 3. Mount Vite middlewares in development
    if (!isProduction) {
      logger.info('Mounting Vite dev middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving
      const distPath = path.resolve(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        const express = (await import('express')).default;
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) return next();
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }

    app.listen(port, '0.0.0.0', () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 Server listening on http://0.0.0.0:${port}`);
      logger.info(`📖 Swagger UI Docs: http://localhost:${port}/api/docs`);
      logger.info(`📥 Postman Collection: http://localhost:${port}/api/postman-collection`);
      logger.info(`❤️ Health Check: http://localhost:${port}/api/v1/system/health`);
      logger.info(`📊 System Metrics: http://localhost:${port}/api/v1/system/metrics`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
