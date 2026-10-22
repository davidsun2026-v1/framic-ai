import type { GrantCreditsRpcArgs, GrantCreditsRpcResult } from '@framic/types';
import { createServiceClient } from './service';

/**
 * Execute the live eight-argument credit-grant RPC from trusted server code.
 * This helper intentionally uses the service-role client and must never be
 * imported into a Client Component.
 */
export async function grantCredits(
  input: GrantCreditsRpcArgs,
): Promise<GrantCreditsRpcResult> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('grant_credits', {
    p_user_id: input.p_user_id,
    p_amount: input.p_amount,
    p_reason: input.p_reason,
    p_idempotency_key: input.p_idempotency_key,
    p_type: input.p_type ?? 'grant',
    p_correlation_id: input.p_correlation_id ?? null,
    p_metadata: input.p_metadata ?? {},
    p_created_by: input.p_created_by ?? 'payment_webhook',
  });

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Credit grant RPC returned no result row');
  }

  return row as GrantCreditsRpcResult;
}
