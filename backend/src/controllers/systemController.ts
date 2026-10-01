import { Request, Response } from 'express';
import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';

let requestCounter = 0;
export const incrementRequestCounter = () => {
  requestCounter++;
};

export class SystemController {
  /**
   * GET /api/v1/system/health
   */
  static async health(req: Request, res: Response): Promise<void> {
    try {
      await sequelize.authenticate();
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptimeSeconds: Math.floor(process.uptime()),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/system/metrics
   */
  static async metrics(req: Request, res: Response): Promise<void> {
    const memory = process.memoryUsage();

    res.status(200).json({
      uptimeSeconds: Math.floor(process.uptime()),
      totalRequestsServed: requestCounter,
      memoryUsage: {
        rssMB: (memory.rss / (1024 * 1024)).toFixed(2),
        heapTotalMB: (memory.heapTotal / (1024 * 1024)).toFixed(2),
        heapUsedMB: (memory.heapUsed / (1024 * 1024)).toFixed(2),
      },
      nodeVersion: process.version,
      platform: process.platform,
      recentAuditLogs: logger.getAuditLogs().slice(0, 10),
    });
  }
}
