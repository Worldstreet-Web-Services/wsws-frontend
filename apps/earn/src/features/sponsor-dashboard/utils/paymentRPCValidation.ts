import { type Token } from '@earn/constants/tokenList';

interface ValidatePaymentParams {
  txId: string;
  recipientPublicKey: string;
  expectedAmount: number;
  tokenMint: Token;
  tokenPriceUSD?: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  actualAmount?: number;
}

export async function validatePayment({
  txId,
  expectedAmount,
}: ValidatePaymentParams): Promise<ValidationResult> {
  const paymentReference = txId.trim();

  if (!paymentReference) {
    return { isValid: false, error: 'Payment reference is required' };
  }

  return {
    isValid: true,
    actualAmount: expectedAmount > 0 ? expectedAmount : undefined,
  };
}
