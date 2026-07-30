import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Wallet transactions are not available in this build' },
    { status: 410 },
  );
}
