import { Request, Response, NextFunction } from 'express';

export const ALLOWED_REGISTRATION_ROLES = ['student', 'instructor', 'manager'] as const;

export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { email, password, full_name, role } = req.body;
  const errors: string[] = [];

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Поле email должно быть корректным адресом электронной почты.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Пароль должен содержать как минимум 8 символов.');
  }

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Имя (full_name) должно содержать как минимум 2 символа.');
  }

  if (!role || typeof role !== 'string') {
    errors.push(`Поле role обязательно для заполнения. Доступные роли: ${ALLOWED_REGISTRATION_ROLES.join(', ')}.`);
  } else if (!ALLOWED_REGISTRATION_ROLES.includes(role.trim().toLowerCase() as any)) {
    errors.push(`Недопустимая роль '${role}'. Допустимые роли: ${ALLOWED_REGISTRATION_ROLES.join(', ')}.`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации входных данных.',
        details: errors,
      },
    });
    return;
  }

  // Sanitize
  req.body.email = email.trim().toLowerCase();
  req.body.full_name = full_name.trim();
  req.body.role = role.trim().toLowerCase();
  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email и пароль обязательны для заполнения.',
      },
    });
    return;
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

export function validateCourseCreate(req: Request, res: Response, next: NextFunction): void {
  const { title, description, price, start_date, max_seats } = req.body;
  const errors: string[] = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Название курса должно содержать от 3 символов.');
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('Описание курса должно содержать от 10 символов.');
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('Цена курса должна быть неотрицательным числом.');
  }
  if (!start_date || isNaN(Date.parse(start_date))) {
    errors.push('Дата начала курса (start_date) должна быть валидной датой.');
  }
  if (!max_seats || typeof max_seats !== 'number' || max_seats < 1) {
    errors.push('Количество мест (max_seats) должно быть положительным целым числом.');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Некорректные параметры курса.',
        details: errors,
      },
    });
    return;
  }

  next();
}

function checkLuhn(cardNumber: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let n = parseInt(cardNumber.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function validateCardAdd(req: Request, res: Response, next: NextFunction): void {
  const { card_number, cleanCardNumber: aliasCardNumber, card_holder, exp_month, exp_year, cvv, cleanCvv: aliasCvv } = req.body;
  const errors: string[] = [];

  const rawCardNumber = card_number || aliasCardNumber;
  const cleanCardNumber = rawCardNumber ? String(rawCardNumber).replace(/[\s-]/g, '') : '';
  if (!cleanCardNumber || !/^\d{16}$/.test(cleanCardNumber)) {
    errors.push('Номер карты должен содержать ровно 16 цифр.');
  } else if (!checkLuhn(cleanCardNumber)) {
    errors.push('Номер карты не прошел проверку контрольной суммы алгоритма Луна.');
  }

  if (!card_holder || typeof card_holder !== 'string' || card_holder.trim().length < 2) {
    errors.push('Имя держателя карты (card_holder) обязательно.');
  }

  const month = parseInt(exp_month, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    errors.push('Месяц окончания (exp_month) должен быть от 1 до 12.');
  }

  const currentYear = new Date().getFullYear();
  const year = parseInt(exp_year, 10);
  if (isNaN(year) || year < currentYear || year > currentYear + 20) {
    errors.push(`Год окончания (exp_year) должен быть не ранее ${currentYear}.`);
  }

  const rawCvv = cvv || aliasCvv;
  const cleanCvv = rawCvv ? String(rawCvv).trim() : '';
  if (!cleanCvv || !/^\d{3,4}$/.test(cleanCvv)) {
    errors.push('Код CVV должен содержать 3 или 4 цифры.');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Некорректные реквизиты банковской карты.',
        details: errors,
      },
    });
    return;
  }

  req.body.card_number = cleanCardNumber;
  req.body.cleanCardNumber = cleanCardNumber;
  req.body.card_holder = card_holder.trim().toUpperCase();
  req.body.exp_month = month;
  req.body.exp_year = year;
  req.body.cvv = cleanCvv;
  req.body.cleanCvv = cleanCvv;
  next();
}
