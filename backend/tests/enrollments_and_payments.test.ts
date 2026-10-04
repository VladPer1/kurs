import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Enrollments & ACID Payments Workflow', () => {
  let studentToken = '';
  let courseId = '';
  let initialSeats = 0;
  let enrollmentId = '';

  test('setup student login and retrieve available course', async () => {
    // Register dedicated student for clean workflow
    const sRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `workflow_student_${Date.now()}@test.local`,
        password: 'WorkflowPassword123!',
        full_name: 'Студент Потока',
        role: 'student',
      }),
    });
    const sData = await sRes.json();
    studentToken = sData.data.access_token;

    // Get first published course
    const cRes = await fetch(`${BASE_URL}/courses`);
    const cData = await cRes.json();
    const course = cData.data[0];
    courseId = course.id;
    initialSeats = course.available_seats;
    assert.ok(courseId);
  });

  test('student creates enrollment and reserves a seat', async () => {
    const res = await fetch(`${BASE_URL}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ course_id: courseId }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    enrollmentId = body.data.id;
    assert.strictEqual(body.data.status, 'pending_payment');

    // Verify seat was decremented
    const cRes = await fetch(`${BASE_URL}/courses/${courseId}`);
    const updatedCourse = (await cRes.json()).data;
    assert.strictEqual(updatedCourse.available_seats, initialSeats - 1);
  });

  test('prevents duplicate active enrollment on the same course (HTTP 409)', async () => {
    const res = await fetch(`${BASE_URL}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ course_id: courseId }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ALREADY_ENROLLED');
    assert.ok(body.error.enrollment_id, 'enrollment_id must be in snake_case');
    assert.strictEqual(body.error.enrollmentId, undefined, 'Must not be camelCase enrollmentId');
  });

  test('successfully processes payment for enrollment in ACID transaction', async () => {
    // First bind a test card to the student
    const cardRes = await fetch(`${BASE_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        card_number: '4532758812345678',
        card_holder: 'FLOW STUDENT',
        exp_month: '12',
        exp_year: '2028',
        cvv: '999',
        is_default: true,
      }),
    });
    const cardId = (await cardRes.json()).data.id;

    // Checkout payment
    const payRes = await fetch(`${BASE_URL}/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        payment_method_id: cardId,
      }),
    });

    assert.strictEqual(payRes.status, 200);
    const payBody = await payRes.json();
    assert.strictEqual(payBody.success, true);
    assert.ok(payBody.data.payment_id);
    assert.ok(payBody.data.transaction_ref);
    assert.ok(payBody.data.paid_at);
    assert.strictEqual(payBody.data.paymentId, undefined, 'Must not have camelCase paymentId');

    // Verify enrollment status changed to confirmed
    const myEnrRes = await fetch(`${BASE_URL}/enrollments/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myEnr = await myEnrRes.json();
    const paidEnr = myEnr.data.find((e: any) => e.id === enrollmentId);
    assert.strictEqual(paidEnr.status, 'confirmed');
  });

  test('rejects payment on already paid enrollment (HTTP 400)', async () => {
    const payRes = await fetch(`${BASE_URL}/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
      }),
    });

    assert.strictEqual(payRes.status, 400);
    const body = await payRes.json();
    assert.strictEqual(body.error.code, 'ALREADY_PAID');
  });
});
