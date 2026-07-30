import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mintAddress = searchParams.get('mintAddress');

  if (!mintAddress) {
    return NextResponse.json(
      { error: 'Mint address is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({ price: 1 });
}
