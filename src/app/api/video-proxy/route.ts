import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const referer = searchParams.get('referer') || '';
  const origin = searchParams.get('origin') || '';

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing video url' }, { status: 400 });
  }

  // Extract browser range header for scrubbing support (HTTP 206)
  const rangeHeader = request.headers.get('Range') || '';

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;
    if (rangeHeader) headers['Range'] = rangeHeader;

    // Fetch video stream from the upstream CDN
    const res = await fetch(targetUrl, { 
      headers,
      cache: 'no-store'
    });

    const responseHeaders: Record<string, string> = {
      'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Cache-Control': 'public, max-age=3600',
    };

    // Forward range headers back to the browser
    const contentRange = res.headers.get('Content-Range');
    const contentLength = res.headers.get('Content-Length');
    
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('Video Proxy Exception:', err.message);
    return NextResponse.json({ error: 'Failed to proxy video stream' }, { status: 502 });
  }
}
