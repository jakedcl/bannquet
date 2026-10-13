import { getAuth, isAuthConfigured } from '@/lib/auth/server';

async function unavailable(): Promise<Response> {
  return Response.json({ error: 'Auth is not configured' }, { status: 503 });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function delegate(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  request: Request,
  context: RouteContext,
) {
  if (!isAuthConfigured()) return unavailable();
  const handler = getAuth().handler();
  return handler[method](request, context);
}

export function GET(request: Request, context: RouteContext) {
  return delegate('GET', request, context);
}

export function POST(request: Request, context: RouteContext) {
  return delegate('POST', request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return delegate('PUT', request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return delegate('DELETE', request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return delegate('PATCH', request, context);
}
