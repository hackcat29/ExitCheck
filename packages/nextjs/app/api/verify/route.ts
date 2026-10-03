import { NextResponse } from 'next/server';
import { envelopeSchema, verifyEnvelope } from '@exitcheck/core';
import { verifyHcs } from '@exitcheck/core/proof';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 250000)
      return NextResponse.json(
        { error: 'Report exceeds 250 KB' },
        { status: 413 },
      );
    const raw = JSON.parse(text),
      e = envelopeSchema.parse(raw),
      local = verifyEnvelope(e);
    const url = new URL(request.url),
      topic = url.searchParams.get('topic'),
      sequence = url.searchParams.get('sequence'),
      payer = url.searchParams.get('payer') ?? undefined;
    if (topic || sequence) {
      if (!topic || !sequence)
        return NextResponse.json(
          {
            ...local,
            valid: false,
            reason: 'Supply both an HCS topic ID and sequence number.',
          },
          { status: 400 },
        );
      const hcs = await verifyHcs(e, topic, sequence, payer);
      return NextResponse.json({
        ...local,
        valid: local.valid && hcs.matches,
        reason: !hcs.matches
          ? 'HCS commitment or expected payer does not match this report'
          : local.valid
            ? `${local.reason}. HCS commitment matches.`
            : local.reason,
        hcs,
      });
    }
    return NextResponse.json(local);
  } catch {
    return NextResponse.json(
      {
        valid: false,
        fresh: false,
        reason:
          'Invalid report or HCS message unavailable. Check the file, topic and sequence; Mirror indexing may take a few seconds.',
      },
      { status: 400 },
    );
  }
}
