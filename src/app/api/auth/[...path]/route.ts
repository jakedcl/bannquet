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

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (path.join('/') === 'sign-up/email') {
    return Response.json(
      { message: 'Ask Jake for an invite link to make an account.', code: 'SIGN_UP_DISABLED' },
      { status: 403 },
    );
  }
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
