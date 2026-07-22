import { NextResponse } from 'next/server';

// Helper to rewrite relative paths in .m3u8 playlists into absolute proxied URLs
function rewriteM3U8(
  content: string, 
  baseUrl: string, 
  referer: string, 
  origin: string, 
  proxyOrigin: string
): string {
  const lines = content.split('\n');
  // Base query string for our proxy
  const proxyPrefix = `${proxyOrigin}/api/video-proxy?referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}&url=`;

  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 1. Rewrite tags containing URIs (like subtitles or encryption keys)
    // Example: #EXT-X-MEDIA:TYPE=SUBTITLES,...,URI="subtitle_tmf9hy08/in.m3u8"
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (match, p1) => {
        try {
          const absoluteUrl = new URL(p1, baseUrl).href;
          return `URI="${proxyPrefix}${encodeURIComponent(absoluteUrl)}"`;
        } catch {
          return match;
        }
      });
    }

    // 2. Rewrite direct relative/absolute paths to playlists or TS segments
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).href;
      return `${proxyPrefix}${encodeURIComponent(absoluteUrl)}`;
    } catch {
      return line; // Fallback if parsing fails
    }
  });

  return rewrittenLines.join('\n');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const referer = searchParams.get('referer') || '';
  const origin = searchParams.get('origin') || '';

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing video url' }, { status: 400 });
  }

  // Extract protocol and host from request headers to build proxy links
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.url.startsWith('https') ? 'https' : 'http';
  const proxyOrigin = `${protocol}://${host}`;

  const rangeHeader = request.headers.get('Range') || '';

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;
    if (rangeHeader) headers['Range'] = rangeHeader;

    // Fetch resources from CDN
    const res = await fetch(targetUrl, { 
      headers,
      cache: 'no-store'
    });

    const contentType = res.headers.get('Content-Type') || '';
    const isM3U8 = targetUrl.includes('.m3u8') || 
                   contentType.includes('mpegurl') || 
                   contentType.includes('mpegURL');

    // If it's a playlist (.m3u8), we rewrite it to resolve relative pathways
    if (isM3U8) {
      const originalText = await res.text();
      // Get base URL directory of the target playlist
      const parsedUrl = new URL(targetUrl);
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      const rewrittenText = rewriteM3U8(originalText, baseUrl, referer, origin, proxyOrigin);

      return new Response(rewrittenText, {
        status: res.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
    }

    // Binary segment files (.ts, .mp4), stream direct piping
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType || 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Cache-Control': 'public, max-age=86400',
    };

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
