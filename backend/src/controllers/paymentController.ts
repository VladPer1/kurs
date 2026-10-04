import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Payment, Enrollment, Course, PaymentMethod, User } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { sequelize } from '../config/database.js';

export class PaymentController {
  // CheckoutPayment Godoc
  // @Summary      Оплата курса
  // @Description  Проведение оплаты за выбранный курс в ACID-транзакции (разрешение payments:create)
  // @Tags         payments
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        request  body      models.CheckoutPaymentRequest  true  "ID записи и карты"
  // @Success      200      {object}  models.PaymentSuccessResponse
  // @Failure      400      {object}  models.ErrorResponse
  // @Router       /payments/checkout [post]
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
          error: { code: 'PAYMENT_METHOD_INVALID', message: 'Указанная карта не найдена в вашем профиле.' },
        });
        return;
      }
      verifiedPaymentMethodId = pm.id;
    } else {
      // Find default card
      const defaultCard = await PaymentMethod.findOne({
        where: { user_id: userId, is_default: true },
      });
      if (defaultCard) {
        verifiedPaymentMethodId = defaultCard.id;
      }
    }

    const amount = enrollment.course.price;
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

  // GetMyPayments Godoc
  // @Summary      История платежей пользователя
  // @Description  История оплат текущего пользователя (разрешение payments:view_my)
  // @Tags         payments
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.MyPaymentsResponse
  // @Router       /payments/my [get]
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

  // GetAllPayments Godoc
  // @Summary      Реестр всех платежей платформы
  // @Description  Полный журнал оплат курсов (Только Администратор, разрешение payments:view_all)
  // @Tags         payments
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.PaymentListResponse
  // @Failure      403  {object}  models.ErrorResponse
  // @Router       /payments [get]
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
