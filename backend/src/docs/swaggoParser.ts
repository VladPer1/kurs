import fs from 'fs';
import path from 'path';

export interface SwaggoDocConfig {
  info: {
    title: string;
    version: string;
    description: string;
  };
  basePath: string;
  controllersDir: string;
}

export function generateSwaggerFromSwaggo(config: SwaggoDocConfig): any {
  const { info, basePath, controllersDir } = config;

  const paths: Record<string, any> = {};

  const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse swaggo blocks
    const lines = content.split('\n');
    let currentBlock: string[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') && (trimmed.includes('Godoc') || trimmed.includes('@Summary'))) {
        currentBlock = [];
      }

      if (currentBlock && trimmed.startsWith('//')) {
        currentBlock.push(trimmed.replace(/^\/\/\s*/, ''));
        if (trimmed.includes('@Router')) {
          processSwaggoBlock(currentBlock, paths);
          currentBlock = null;
        }
      } else if (currentBlock && !trimmed.startsWith('//')) {
        currentBlock = null;
      }
    }
  }

  return {
    openapi: '3.0.3',
    info,
    servers: [{ url: basePath, description: 'API v1 Base Endpoint' }],
    tags: [
      { name: 'auth', description: 'Регистрация, вход, refresh токенов и аудит безопасности (OWASP A07)' },
      { name: 'users', description: 'Управление пользователями и связанными курсами (Только Администратор)' },
      { name: 'roles', description: 'Управление ролями и динамическими атомарными правами (Dynamic RBAC)' },
      { name: 'courses', description: 'Каталог, создание и управление курсами (право courses:create)' },
      { name: 'instructors', description: 'Профили преподавателей и просмотр записанных студентов' },
      { name: 'enrollments', description: 'Запись на курсы и управление заявками' },
      { name: 'cards', description: 'Привязка и безопасное хранение карт (AES-256-GCM, OWASP A02)' },
      { name: 'payments', description: 'Оплата курсов и реестр финансовых транзакций' },
      { name: 'system', description: 'Health check и метрики производительности' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT Access токен (Bearer <token>)',
        },
      },
    },
    paths,
  };
}

function processSwaggoBlock(block: string[], paths: Record<string, any>) {
  let summary = '';
  let description = '';
  const tags: string[] = [];
  let routerPath = '';
  let routerMethod = '';
  let isSecure = false;
  const parameters: any[] = [];
  let requestBody: any = null;
  const responses: Record<string, any> = {};

  for (const line of block) {
    if (line.startsWith('@Summary')) {
      summary = line.replace('@Summary', '').trim();
    } else if (line.startsWith('@Description')) {
      description = line.replace('@Description', '').trim();
    } else if (line.startsWith('@Tags')) {
      const tagStr = line.replace('@Tags', '').trim();
      tagStr.split(/\s+/).forEach((t) => {
        if (t) tags.push(t);
      });
    } else if (line.startsWith('@Security')) {
      isSecure = true;
    } else if (line.startsWith('@Router')) {
      const match = line.replace('@Router', '').trim().match(/^(\S+)\s*\[(\w+)\]/);
      if (match) {
        routerPath = match[1];
        routerMethod = match[2].toLowerCase();
      }
    } else if (line.startsWith('@Param')) {
      // Swaggo format: @Param <name> <in> <type> <required> "<description>"
      const raw = line.replace('@Param', '').trim();
      const parts = raw.split(/\s+/);
      if (parts.length >= 4) {
        const paramName = parts[0];
        const paramIn = parts[1].toLowerCase();
        const paramType = parts[2];
        const paramRequired = parts[3].toLowerCase() === 'true';

        // Extract quoted description
        const descMatch = raw.match(/"([^"]+)"/);
        const paramDesc = descMatch ? descMatch[1] : '';

        if (paramIn === 'body') {
          requestBody = {
            required: paramRequired,
            description: paramDesc || 'Request payload',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          };
        } else {
          parameters.push({
            name: paramName,
            in: paramIn,
            required: paramRequired,
            description: paramDesc,
            schema: {
              type: paramType === 'int' ? 'integer' : paramType,
            },
          });
        }
      }
    } else if (line.startsWith('@Success') || line.startsWith('@Failure')) {
      // Swaggo format: @Success 200 {object} models.User "Description"
      const raw = line.replace(/^@(Success|Failure)/, '').trim();
      const parts = raw.split(/\s+/);
      if (parts.length >= 1) {
        const statusCode = parts[0];
        const descMatch = raw.match(/"([^"]+)"/);
        const respDesc = descMatch ? descMatch[1] : parts.slice(2).join(' ') || 'Response';

        responses[statusCode] = {
          description: respDesc,
          content: {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
          },
        };
      }
    }
  }

  if (routerPath && routerMethod) {
    if (!paths[routerPath]) {
      paths[routerPath] = {};
    }

    const op: any = {
      tags: tags.length ? tags : ['General'],
      summary: summary || routerPath,
      description: description || summary,
      parameters,
      responses: Object.keys(responses).length
        ? responses
        : { '200': { description: 'Успешный ответ' } },
    };

    if (requestBody) {
      op.requestBody = requestBody;
    }

    if (isSecure) {
      op.security = [{ bearerAuth: [] }];
    }

    paths[routerPath][routerMethod] = op;
  }
}
