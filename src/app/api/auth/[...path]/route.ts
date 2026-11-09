import { getAuth, isAuthConfigured } from '@/lib/auth/server';

async function unavailable(): Promise<Response> {
  return Response.json({ error: 'Auth is not configured' }, { status: 503 });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function delegate(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', request: Request) {
  if (!isAuthConfigured()) return unavailable();
  const handler = getAuth().handler();
  return handler[method](request);
}

export function GET(request: Request) {
  return delegate('GET', request);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (path.join('/') === 'sign-up/email') {
    return Response.json(
      { message: 'Ask Jake for an invite link to make an account.', code: 'SIGN_UP_DISABLED' },
      { status: 403 },
    );
  }
  return delegate('POST', request);
}

export function PUT(request: Request) {
  return delegate('PUT', request);
}

export function DELETE(request: Request) {
  return delegate('DELETE', request);
}

export function PATCH(request: Request) {
  return delegate('PATCH', request);
}
