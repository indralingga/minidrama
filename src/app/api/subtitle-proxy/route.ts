import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing subtitle url' }, { status: 400 });
  }

  try {
    // Ignore SSL certificate verification issues for CDN subtitle links
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const res = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.netshort.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch subtitle: ${res.status}`);
    }

    let text = await res.text();

    // Convert SRT format to WebVTT if needed
    if (!text.trim().startsWith("WEBVTT")) {
      text = "WEBVTT\n\n" + text.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
    }

    return new Response(text, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('Subtitle Proxy Error:', err.message);
    return NextResponse.json({ error: 'Failed to proxy subtitle' }, { status: 502 });
  }
}
