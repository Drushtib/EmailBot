import { NextResponse } from 'next/server';
import { getPublicSenderAccounts } from '../../../lib/senderAccounts';

export async function GET() {
  const accounts = getPublicSenderAccounts();
  return NextResponse.json({ accounts });
}
