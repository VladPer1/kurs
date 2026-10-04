import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Cards & Payment Methods (OWASP A02)', () => {
  let studentToken = '';

  test('setup: login as student to obtain access_token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@course-platform.local',
        password: 'StudentPassword123!',
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    studentToken = body.data.access_token;
    assert.ok(studentToken);
  });

  test('fails card addition on invalid card number (fails Luhn algorithm)', async () => {
    const res = await fetch(`${BASE_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        card_number: '1234567812345671', // Invalid Luhn checksum
        card_holder: 'INVALID CARD',
        exp_month: '12',
        exp_year: '2028',
        cvv: '123',
        is_default: true,
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      body.error.details.some((d: string) => d.includes('контрольную сумму') || d.includes('Луна')),
      'Should fail Luhn check'
    );
  });

  test('fails card addition on expired date or invalid month', async () => {
    const res = await fetch(`${BASE_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        card_number: '4532758812345678',
        card_holder: 'EXPIRED CARD',
        exp_month: '13', // Invalid month
        exp_year: '2021', // Past year
        cvv: '123',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  });

  test('successfully binds valid card with masked last4 and encrypted payload', async () => {
    const res = await fetch(`${BASE_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        card_number: '4532758812345678',
        card_holder: 'IVAN PETROV',
        exp_month: '12',
        exp_year: '2028',
        cvv: '456',
        is_default: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.last4, '5678');
    assert.strictEqual(body.data.card_holder, 'IVAN PETROV');
    assert.strictEqual(body.data.exp_month, 12);
    assert.strictEqual(body.data.exp_year, 2028);
    assert.strictEqual(body.data.is_default, true);
    assert.ok(body.data.created_at);
    assert.strictEqual(body.data.card_number, undefined, 'Full PAN must NEVER be returned in plaintext');
    assert.strictEqual(body.data.cvv, undefined, 'CVV must NEVER be returned in plaintext');
  });

  test('retrieves user cards without exposing encrypted ciphertext', async () => {
    const res = await fetch(`${BASE_URL}/cards`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    const card = body.data[0];
    assert.ok(card.id);
    assert.ok(card.last4);
    assert.strictEqual(card.encrypted_payload, undefined, 'Encrypted ciphertext must never leak to API consumer');
  });
});
