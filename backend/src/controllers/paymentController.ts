import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Payment, Enrollment, Course, PaymentMethod, User } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { sequelize } from '../config/database.js';

export class PaymentController {
  /**
   * POST /api/v1/payments/checkout
   * Execute payment for enrollment using saved or new payment method
   */
  static async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const { enrollment_id, payment_method_id } = req.body;

    if (!enrollment_id) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'enrollment_id обязателен.' },
      });
      return;
    }

    const enrollment = await Enrollment.findOne({
      where: { id: enrollment_id, user_id: userId },
      include: [{ model: Course, as: 'course' }],
    });

    if (!enrollment) {
      res.status(404).json({
        success: false,
        error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Запись на курс не найдена или принадлежит другому пользователю.' },
      });
      return;
    }

    if (enrollment.status === 'confirmed') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'Данная запись уже оплачена и подтверждена.' },
      });
      return;
    }

    if (enrollment.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: { code: 'ENROLLMENT_CANCELLED', message: 'Нельзя оплатить отмененную запись.' },
      });
      return;
    }

    // Verify payment method belongs to user if specified
    let verifiedPaymentMethodId: string | null = null;
    if (payment_method_id) {
      const pm = await PaymentMethod.findOne({
        where: { id: payment_method_id, user_id: userId },
      });
      if (!pm) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYMENT_METHOD', message: 'Указанная банковская карта не найдена.' },
        });
        return;
      }
      verifiedPaymentMethodId = pm.id;
    }

    const amount = enrollment.course ? enrollment.course.price : 0.0;
    const transaction_ref = `tx_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    // Process payment in ACID transaction
    const t = await sequelize.transaction();
    try {
      const payment = await Payment.create(
        {
          enrollment_id: enrollment.id,
          user_id: userId!,
          payment_method_id: verifiedPaymentMethodId,
          amount,
          status: 'succeeded',
          transaction_ref,
          paid_at: new Date(),
        },
        { transaction: t }
      );

      await enrollment.update({ status: 'confirmed' }, { transaction: t });

      await t.commit();

      res.status(200).json({
        success: true,
        message: 'Оплата успешно завершена! Доступ к курсу активирован.',
        data: {
          paymentId: payment.id,
          transactionRef: payment.transaction_ref,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paid_at,
          course: {
            id: enrollment.course.id,
            title: enrollment.course.title,
            startDate: enrollment.course.start_date,
          },
        },
      });
    } catch (err: any) {
      await t.rollback();
      res.status(500).json({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: 'Ошибка при проведении платежа в банковском шлюзе.' },
      });
    }
  }

  /**
   * GET /api/v1/payments/my
   * Get user's payment history
   */
  static async getMyPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    const payments = await Payment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Enrollment,
          as: 'enrollment',
          include: [{ model: Course, as: 'course' }],
        },
        {
          model: PaymentMethod,
          as: 'payment_method',
          attributes: ['id', 'card_holder', 'last4', 'exp_month', 'exp_year'],
        },
      ],
      order: [['paid_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: payments,
    });
  }

  /**
   * GET /api/v1/payments
   * List all platform payments (Admin only)
   * Requires permission: payments:view_all
   */
  static async getAllPayments(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const payments = await Payment.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
        },
        {
          model: Enrollment,
          as: 'enrollment',
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title', 'price'],
            },
          ],
        },
        {
          model: PaymentMethod,
          as: 'payment_method',
          attributes: ['id', 'last4', 'card_holder'],
        },
      ],
      order: [['paid_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: {
        total: payments.length,
        payments,
      },
    });
  }
}
