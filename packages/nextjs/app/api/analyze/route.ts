import { NextResponse } from 'next/server';
import { createReport, envelope, requestSchema } from '@exitcheck/core';
import { demoSnapshot } from '@exitcheck/core/demo';
import { liveSnapshot } from '@exitcheck/core/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 8000)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const parsed = requestSchema.safeParse(JSON.parse(text));
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        },
        { status: 400 },
      );
    const req = parsed.data,
      snapshot = req.mode === 'demo' ? demoSnapshot() : await liveSnapshot(req);
    const { createReport: calculate } = await import('@exitcheck/core');
    const report = createReport(snapshot, req);
    const ladder = [2500, 5000, 7500, 10000].map((liquidationBps) => ({
      liquidationBps,
      result: calculate(snapshot, { ...req, liquidationBps }).result,
    }));
    const stress = [10000, 7500, 5000, 2500].map((liquidityBps) => ({
      liquidityBps,
      result: calculate(snapshot, { ...req, liquidityBps }).result,
    }));
    return NextResponse.json(
      { envelope: envelope(report), ladder, stress },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    const safe =
      /Obligation|decimal|amount|Payout asset|Treasury|Observation/.test(
        message,
      )
        ? message
        : 'Live sources could not be read. Retry, check the account and payout IDs, or run the demo. No cached result was substituted.';
    return NextResponse.json({ error: safe }, { status: 422 });
  }
}
