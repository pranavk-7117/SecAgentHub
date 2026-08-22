import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rawCandidates = [
  process.env.BACKEND_API_BASE,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "https://secagent-hub-api-production-39fc.up.railway.app",
  "http://127.0.0.1:8012",
  "http://127.0.0.1:8011",
  "http://127.0.0.1:8010",
  "http://127.0.0.1:8000"
].filter(Boolean) as string[];


const BACKEND_CANDIDATES = rawCandidates.map(url => {
  let trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
});

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}

async function proxy(request: NextRequest, path: string[]) {
  const suffix = path.join("/");
  const search = request.nextUrl.search || "";
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : Buffer.from(await request.arrayBuffer());
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("accept-encoding");

  let lastError = "";
  for (const base of BACKEND_CANDIDATES) {
    try {
      const upstream = await fetch(`${base}/api/v1/${suffix}${search}`, {
        method: request.method,
        headers,
        body,
        cache: "no-store"
      });
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set("X-SecAgent-Backend", base);
      return new NextResponse(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(
    {
      detail: "Backend is not reachable from the Next proxy.",
      tried: BACKEND_CANDIDATES,
      last_error: lastError
    },
    { status: 502 }
  );
}
