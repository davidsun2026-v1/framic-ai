import { createHmac, timingSafeEqual } from 'node:crypto';

// Paystack signs webhook deliveries with HMAC-SHA512 over the raw request
// body, keyed by the account's secret key, sent in the x-paystack-signature
// header (hex-encoded). See https://paystack.com/docs/payments/webhooks/.
//
// PAYSTACK_WEBHOOK_SECRET is checked first to allow a dedicated webhook
// signing key if one is ever configured; it falls back to PAYSTACK_SECRET_KEY,
// which is what Paystack actually uses for signing today and is the only
// Paystack secret currently defined in .env.example.
export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    // Fail closed: never treat a request as verified when we have no secret
    // to check it against.
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, providedBuf);
}
