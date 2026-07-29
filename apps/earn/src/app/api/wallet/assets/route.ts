import { type NextRequest, NextResponse } from 'next/server';

import { type TokenAsset } from '@earn/features/wallet/types/TokenAsset';

interface ErrorResponse {
  error: string;
}

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<TokenAsset[] | ErrorResponse>> {
  return NextResponse.json([]);
}
