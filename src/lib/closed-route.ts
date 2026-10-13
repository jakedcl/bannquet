import { NextResponse } from 'next/server';

export function closedRoute() {
  return NextResponse.json(
    {
      success: false,
      error: 'Trip report writing moved off Sanity. In-site forms come in a later phase.',
    },
    { status: 410 },
  );
}
