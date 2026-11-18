/**
 * Framic AI — Common primitives
 *
 * Shared scalar contracts. Timestamps are ISO-8601 strings (JSON-safe across
 * HTTP, WebSocket and broker boundaries); Token amounts are whole integers.
 */
import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

export const IsoTimestampSchema = z.string().datetime({ offset: true });
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

/**
 * Whole, non-negative Token amount. Fractions and currency values are not
 * representable. Persisted as bigint; JavaScript safe-integer range is the
 * enforced ceiling at every API boundary.
 */
export const TokenAmountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export type TokenAmount = z.infer<typeof TokenAmountSchema>;

export const PositiveTokenAmountSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export type PositiveTokenAmount = z.infer<typeof PositiveTokenAmountSchema>;
