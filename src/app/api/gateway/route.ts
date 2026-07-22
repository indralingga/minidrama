import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerSlug = searchParams.get('provider') || 'netshort';
  const action = searchParams.get('action') || 'rank';
  const id = searchParams.get('id');
  const q = searchParams.get('q');
  const lang = searchParams.get('lang');

  const CUTAD_API_KEY = process.env.CUTAD_API_KEY || "cutad_0789e542fdbca8b2439336b1f5faea258261af38";

  // Build target URL
  let targetUrl = `https://www.cutad.web.id/api/public/${providerSlug}?action=${action}`;
  if (id) targetUrl += `&id=${encodeURIComponent(id)}`;
  if (q) targetUrl += `&q=${encodeURIComponent(q)}`;
  if (lang) targetUrl += `&lang=${encodeURIComponent(lang)}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'x-api-key': CUTAD_API_KEY,
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache API responses for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CUTAD API Error (${response.status}):`, errorText);
      return NextResponse.json(
        { status: false, error: `Upstream error ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Gateway Proxy Exception:', error.message);
    return NextResponse.json(
      { status: false, error: 'Failed to reach CutAd gateway' },
      { status: 502 }
    );
  }
}
