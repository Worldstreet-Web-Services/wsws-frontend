import { type NextRequest, NextResponse } from 'next/server';

import { type TokenActivity } from '@earn/features/wallet/types/TokenActivity';

interface ErrorResponse {
  error: string;
}

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<TokenActivity[] | ErrorResponse>> {
  return NextResponse.json([]);
}
