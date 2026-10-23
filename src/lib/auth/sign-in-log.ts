export type SignInFailureReason = 'no_account' | 'wrong_password' | 'auth_error' | 'rate_limited';

export type SignInLogContext = {
  login: string;
  email?: string;
  reason?: SignInFailureReason;
};

function stamp(): string {
  return new Date().toISOString();
}

export function logSignInSuccess(login: string, email: string): void {
  console.info('sign-in success', {
    login,
    email,
    at: stamp(),
  });
}

export function logSignInFailure(context: SignInLogContext): void {
  console.info('sign-in failed', {
    login: context.login,
    email: context.email ?? null,
    reason: context.reason ?? 'auth_error',
    at: stamp(),
  });
}
