import path from 'path';
import { generateSwaggerFromSwaggo } from './swaggoParser.js';

const controllersDirectory = path.resolve(process.cwd(), 'backend', 'src', 'controllers');

export const swaggerDocument = generateSwaggerFromSwaggo({
  info: {
    title: 'Course & Training Management System API (ИПР №1)',
    version: '1.0.0',
    description:
      'Безопасный REST API для системы управления курсами, личным кабинетом студента, кабинетом преподавателя и динамическим RBAC (Role-Based Access Control). Спецификация сгенерирована из декларативных аннотаций Swaggo (// Method Godoc, @Summary, @Description, @Tags, @Param, @Success, @Failure, @Router) в контроллерах.',
  },
  basePath: '/api/v1',
  controllersDir: controllersDirectory,
});
