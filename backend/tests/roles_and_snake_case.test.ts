import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Roles, Dynamic RBAC & Strict snake_case Contract', () => {
  let adminToken = '';

  test('setup admin login', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@course-platform.local', password: 'AdminPassword123!' }),
    });
    adminToken = (await res.json()).data.access_token;
    assert.ok(adminToken);
  });

  test('GET /roles includes admin, instructor, student, and manager roles', async () => {
    const res = await fetch(`${BASE_URL}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    const roleNames = body.data.map((r: any) => r.name);

    assert.ok(roleNames.includes('admin'), 'admin role must exist');
    assert.ok(roleNames.includes('instructor'), 'instructor role must exist');
    assert.ok(roleNames.includes('student'), 'student role must exist');
    assert.ok(roleNames.includes('manager'), 'manager role must exist');
  });

  test('PATCH /users/{id}/role assigns role to user and returns snake_case payload', async () => {
    // 1. Create a user
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `role_change_${Date.now()}@test.local`,
        password: 'Password123!',
        full_name: 'Пользователь для смены роли',
        role: 'student',
      }),
    });
    const userId = (await regRes.json()).data.user.id;

    // 2. Change role to manager
    const patchRes = await fetch(`${BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role_name: 'manager' }),
    });

    assert.strictEqual(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.success, true);
    assert.strictEqual(patchBody.data.user_id, userId);
    assert.strictEqual(patchBody.data.role, 'manager');
    assert.strictEqual(patchBody.data.userId, undefined, 'Must not contain camelCase userId');
  });

  test('GET /system/health returns purely snake_case schema', async () => {
    const res = await fetch(`${BASE_URL}/system/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'UP');
    assert.ok(typeof body.uptime_seconds === 'number');
    assert.strictEqual(body.uptimeSeconds, undefined, 'Must not contain camelCase uptimeSeconds');
  });

  test('GET /system/metrics returns purely snake_case schema', async () => {
    const res = await fetch(`${BASE_URL}/system/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.uptime_seconds !== undefined);
    assert.ok(body.total_requests_served !== undefined);
    assert.ok(body.memory_usage !== undefined);
    assert.ok(body.memory_usage.rss_mb !== undefined);
    assert.ok(body.memory_usage.heap_total_mb !== undefined);
    assert.ok(body.memory_usage.heap_used_mb !== undefined);
    assert.ok(body.node_version !== undefined);
    assert.ok(Array.isArray(body.recent_audit_logs));

    assert.strictEqual(body.uptimeSeconds, undefined);
    assert.strictEqual(body.totalRequestsServed, undefined);
    assert.strictEqual(body.memoryUsage, undefined);
    assert.strictEqual(body.recentAuditLogs, undefined);
  });
});
