import { NextRequest } from 'next/server';
import { GET as etfGET, POST as etfPOST, OPTIONS as etfOPTIONS } from '@/app/api/actions/etf/[id]/route';

/**
 * Legacy Alias Route: /api/actions/basket/[id]
 * Transparently delegates to /api/actions/etf/[id]
 */
export async function OPTIONS() {
  return etfOPTIONS();
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return etfGET(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return etfPOST(request, context);
}
