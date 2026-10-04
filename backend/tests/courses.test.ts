import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Courses & Role-Based Access Control', () => {
  let studentToken = '';
  let adminToken = '';
  let instructorToken = '';

  test('setup tokens for student, admin, and instructor', async () => {
    const sLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@course-platform.local', password: 'StudentPassword123!' }),
    });
    studentToken = (await sLogin.json()).data.access_token;

    const aLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@course-platform.local', password: 'AdminPassword123!' }),
    });
    adminToken = (await aLogin.json()).data.access_token;

    const iLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.devops@course-platform.local', password: 'Instructor123!' }),
    });
    instructorToken = (await iLogin.json()).data.access_token;
  });

  test('public catalog lists courses with pagination metadata in snake_case', async () => {
    const res = await fetch(`${BASE_URL}/courses?page=1&limit=2`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(typeof body.pagination.total, 'number');
    assert.strictEqual(typeof body.pagination.page, 'number');
    assert.strictEqual(typeof body.pagination.limit, 'number');
    assert.strictEqual(typeof body.pagination.total_pages, 'number');
    assert.strictEqual(body.pagination.totalPages, undefined, 'Must not contain camelCase totalPages');
  });

  test('forbids course creation for students without courses:create permission (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Несанкционированный курс',
        description: 'Попытка студента создать курс',
        price: 10000,
        start_date: '2026-12-01T10:00:00.000Z',
        max_seats: 10,
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
  });

  test('allows instructor to create course successfully (HTTP 201)', async () => {
    const courseTitle = `Kubernetes Advanced Intensive ${Date.now()}`;
    const res = await fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        title: courseTitle,
        description: 'Продвинутый курс по отказоустойчивости кластеров',
        price: 55000,
        start_date: '2026-11-20T10:00:00.000Z',
        max_seats: 20,
        status: 'published',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.title, courseTitle);
    assert.strictEqual(body.data.price, 55000);
    assert.strictEqual(body.data.available_seats, 20);
    assert.strictEqual(body.data.max_seats, 20);
  });
});
