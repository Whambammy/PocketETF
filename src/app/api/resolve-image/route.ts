import { NextRequest, NextResponse } from 'next/server';
import { resolveDirectImageUrl } from '@/lib/imageResolver';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  try {
    const directUrl = await resolveDirectImageUrl(url);
    return NextResponse.json({ original: url, directUrl });
  } catch {
    return NextResponse.json({ original: url, directUrl: url });
  }
}
