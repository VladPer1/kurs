import { test, describe } from 'node:test';
import assert from 'node:assert';
import { encryptAES256GCM, decryptAES256GCM } from '../src/services/cryptoService.js';

describe('AES-256-GCM Encryption Service (OWASP A02)', () => {
  test('encrypts and successfully decrypts sensitive card data', () => {
    const originalText = JSON.stringify({
      card_number: '4532758812345678',
      cvv: '999',
    });

    const encrypted = encryptAES256GCM(originalText);
    assert.ok(encrypted, 'Ciphertext should not be empty');
    assert.notStrictEqual(encrypted, originalText, 'Ciphertext should be different from plaintext');
    assert.strictEqual(encrypted.split(':').length, 3, 'Format should be iv:authTag:encryptedData');

    const decrypted = decryptAES256GCM(encrypted);
    assert.strictEqual(decrypted, originalText, 'Decrypted text should match original plaintext');
  });

  test('produces unique IV for identical plaintexts (IND-CPA security)', () => {
    const payload = 'SecretPayload123';
    const cipher1 = encryptAES256GCM(payload);
    const cipher2 = encryptAES256GCM(payload);

    assert.notStrictEqual(cipher1, cipher2, 'Two encryptions of the same plaintext must use different IVs');
    assert.strictEqual(decryptAES256GCM(cipher1), payload);
    assert.strictEqual(decryptAES256GCM(cipher2), payload);
  });

  test('fails decryption if authentication tag or ciphertext is tampered (Integrity check)', () => {
    const payload = 'ConfidentialFinancialRecord';
    const encrypted = encryptAES256GCM(payload);
    const [iv, tag, ciphertext] = encrypted.split(':');

    // Tamper with authentication tag (flip first hex character while preserving length)
    const tamperedTag = (tag[0] === 'a' ? 'b' : 'a') + tag.slice(1);
    const tamperedPayload = `${iv}:${tamperedTag}:${ciphertext}`;

    assert.throws(
      () => decryptAES256GCM(tamperedPayload),
      /Decryption failed or data integrity compromised/,
      'Tampered tag must trigger integrity error'
    );
  });

  test('throws error on invalid formatted ciphertext strings', () => {
    assert.throws(() => decryptAES256GCM('invalid_format'), /Invalid encrypted payload format/);
    assert.throws(() => decryptAES256GCM('only:two'), /Invalid encrypted payload format/);
  });
});
