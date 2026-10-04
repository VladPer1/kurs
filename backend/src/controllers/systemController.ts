import { Request, Response } from 'express';
import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';

let requestCounter = 0;
export const incrementRequestCounter = () => {
  requestCounter++;
};

export class SystemController {
  // HealthCheck Godoc
  // @Summary      Проверка работоспособности (Health check)
  // @Description  Проверка подключения к базе данных и времени работы сервера
  // @Tags         system
  // @Accept       json
  // @Produce      json
  // @Success      200  {object}  models.HealthResponse
  // @Failure      503  {object}  models.ErrorResponse
  // @Router       /system/health [get]
  static async health(_req: Request, res: Response): Promise<void> {
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

  // SystemMetrics Godoc
  // @Summary      Системные метрики и аудит
  // @Description  Мониторинг памяти Node.js, счетчики запросов и журнал безопасности (разрешение system:monitor)
  // @Tags         system
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.MetricsResponse
  // @Failure      403  {object}  models.ErrorResponse
  // @Router       /system/metrics [get]
  static async metrics(_req: Request, res: Response): Promise<void> {
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
