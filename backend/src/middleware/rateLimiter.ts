import rateLimit from 'express-rate-limit';

// Global API rate limiter (prevents API flooding)
export const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Слишком много запросов с данного IP-адреса. Пожалуйста, повторите попытку через 15 минут.',
    },
  },
});

// Strict rate limiter for Authentication endpoints (OWASP Anti-credential stuffing)
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login attempts per 15 min window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Превышен лимит попыток входа с этого IP-адреса. Попробуйте позже.',
    },
  },
});
