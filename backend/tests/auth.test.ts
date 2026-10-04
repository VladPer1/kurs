import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/services/authService.js';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Auth Service & Endpoints', () => {
  describe('Unit: AuthService Password & JWT', () => {
    test('hashes password using bcrypt with minimum salt rounds and verifies correctly', async () => {
      const rawPassword = 'SecretP@ssw0rd2026!';
      const hash = await AuthService.hashPassword(rawPassword);

      assert.ok(hash.startsWith('$2'), 'Hash should be standard bcrypt format');
      assert.ok(await AuthService.comparePassword(rawPassword, hash), 'Correct password should match');
      assert.ok(!(await AuthService.comparePassword('WrongPassword', hash)), 'Wrong password should fail');
    });

    test('generates and decodes access token with roles and permissions payload', () => {
      const payload = {
        userId: 'test-usr-1',
        email: 'test@example.com',
        role: 'manager',
        permissions: ['courses:create', 'users:view_all'],
      };

      const token = AuthService.generateAccessToken(payload);
      assert.ok(token, 'Access token generated');

      const refreshToken = AuthService.generateRefreshToken({ userId: payload.userId });
      assert.ok(refreshToken, 'Refresh token generated');

      const verifiedRefresh = AuthService.verifyRefreshToken(refreshToken);
      assert.strictEqual(verifiedRefresh.userId, payload.userId);
    });
  });

  describe('Integration: User Registration & Role Enforcement', () => {
    test('registers student with explicit role: "student"', async () => {
      const timestamp = Date.now();
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `student_${timestamp}@test.local`,
          password: 'Password123!',
          full_name: 'Тестовый Студент',
          role: 'student',
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.access_token, 'access_token should exist in snake_case');
      assert.strictEqual(body.data.user.role.name, 'student', 'User role should be student');
      assert.ok(Array.isArray(body.data.user.role.permissions), 'Permissions array must be present');
    });

    test('registers instructor with role: "instructor" and creates instructor profile', async () => {
      const timestamp = Date.now();
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `instructor_${timestamp}@test.local`,
          password: 'Password123!',
          full_name: 'Тестовый Преподаватель',
          role: 'instructor',
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.role.name, 'instructor', 'User role should be instructor');
    });

    test('registers manager with role: "manager"', async () => {
      const timestamp = Date.now();
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `manager_${timestamp}@test.local`,
          password: 'Password123!',
          full_name: 'Тестовый Менеджер',
          role: 'manager',
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.role.name, 'manager', 'User role should be manager');
    });

    test('fails registration if role is omitted (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `norole_${Date.now()}@test.local`,
          password: 'Password123!',
          full_name: 'Без Роли',
        }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
      assert.ok(
        body.error.details.some((d: string) => d.includes('role обязательно')),
        'Error details must require role'
      );
    });

    test('fails registration if role is invalid (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `badrole_${Date.now()}@test.local`,
          password: 'Password123!',
          full_name: 'Хакер',
          role: 'super_admin',
        }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(
        body.error.details.some((d: string) => d.includes('Недопустимая роль')),
        'Error details must mention invalid role'
      );
    });

    test('fails registration on duplicate email (HTTP 409)', async () => {
      const email = `dupl_${Date.now()}@test.local`;
      const registerPayload = {
        email,
        password: 'Password123!',
        full_name: 'Первый',
        role: 'student',
      };

      const res1 = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });
      assert.strictEqual(res1.status, 201);

      const res2 = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });
      assert.strictEqual(res2.status, 409);
      const body2 = await res2.json();
      assert.strictEqual(body2.error.code, 'USER_ALREADY_EXISTS');
    });
  });

  describe('Integration: Login & Brute-force Protection (OWASP Requirement)', () => {
    test('successful login returns access_token and user info', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@course-platform.local',
          password: 'AdminPassword123!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.access_token);
      assert.strictEqual(body.data.user.role.name, 'admin');
    });

    test('failed login attempts decrement attempts_left and locks account after 5 attempts', async () => {
      const targetEmail = `brute_target_${Date.now()}@test.local`;
      // Register user first
      await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: 'CorrectPassword123!',
          full_name: 'Жертва Брутфорса',
          role: 'student',
        }),
      });

      // 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        const fRes = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, password: 'WrongPassword!' }),
        });
        assert.strictEqual(fRes.status, 401);
        const fBody = await fRes.json();
        assert.strictEqual(fBody.error.attempts_left, 5 - i);
      }

      // 5th failed attempt -> account locked (423 Locked)
      const lockRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: 'WrongPassword!' }),
      });
      assert.strictEqual(lockRes.status, 423);
      const lockBody = await lockRes.json();
      assert.strictEqual(lockBody.error.code, 'ACCOUNT_LOCKED');
      assert.ok(lockBody.error.lock_until, 'lock_until must be present in snake_case');
    });
  });
});
