/**
 * Framic AI — API envelope and error contracts
 */
import { z } from 'zod';

export const API_ERROR_HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  INSUFFICIENT_TOKENS: 402,
  FORBIDDEN: 403,
  MEMBER_QUOTA_EXCEEDED: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_KEY_REUSED: 409,
  UNPRICED_CONFIGURATION: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'INSUFFICIENT_TOKENS',
  'FORBIDDEN',
  'MEMBER_QUOTA_EXCEEDED',
  'NOT_FOUND',
  'IDEMPOTENCY_KEY_REUSED',
  'UNPRICED_CONFIGURATION',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthSession {
  user: {
    id: string;
    email: string;
    emailConfirmedAt: string | null;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    expiresIn: number;
    tokenType: string;
  };
}
