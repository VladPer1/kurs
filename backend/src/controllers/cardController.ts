import { Response } from 'express';
import { PaymentMethod } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { encryptAES256GCM } from '../services/cryptoService.js';

export class CardController {
  /**
   * GET /api/v1/cards
   * Safe view of saved payment cards (never reveals encrypted payload)
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    const cards = await PaymentMethod.findAll({
      where: { user_id: userId },
      attributes: ['id', 'card_holder', 'last4', 'exp_month', 'exp_year', 'is_default', 'created_at'],
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: cards,
    });
  }

  /**
   * POST /api/v1/cards
   * Bind new card with AES-256-GCM encryption of sensitive data
   */
  static async addCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const { cleanCardNumber, card_holder, exp_month, exp_year, cleanCvv, is_default } = req.body;

    const last4 = cleanCardNumber.slice(-4);

    // Encrypt card number and CVV using AES-256-GCM (OWASP Requirement 14)
    const sensitivePayload = JSON.stringify({
      cardNumber: cleanCardNumber,
      cvv: cleanCvv,
    });
    const encrypted_payload = encryptAES256GCM(sensitivePayload);

    // If marked default, unset existing default
    if (is_default) {
      await PaymentMethod.update({ is_default: false }, { where: { user_id: userId } });
    }

    const card = await PaymentMethod.create({
      user_id: userId!,
      card_holder,
      last4,
      exp_month,
      exp_year,
      encrypted_payload,
      is_default: Boolean(is_default),
    });

    res.status(201).json({
      success: true,
      message: 'Банковская карта успешно привязана (данные зашифрованы алгоритмом AES-256-GCM).',
      data: {
        id: card.id,
        card_holder: card.card_holder,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        is_default: card.is_default,
        created_at: card.created_at,
      },
    });
  }

  /**
   * DELETE /api/v1/cards/:id
   * Remove payment card
   */
  static async deleteCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user?.userId;

    const card = await PaymentMethod.findOne({
      where: { id, user_id: userId },
    });

    if (!card) {
      res.status(404).json({
        success: false,
        error: { code: 'CARD_NOT_FOUND', message: 'Карта не найдена.' },
      });
      return;
    }

    await card.destroy();

    res.status(200).json({
      success: true,
      message: 'Карта успешно удалена.',
    });
  }
}
