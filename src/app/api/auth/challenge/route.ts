import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/crypto/p256';
import { deviceStore } from '@/lib/auth/deviceStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = (body.identifier || body.email || body.userId || 'demo-client').toLowerCase().trim();

    const challenge = createChallenge(identifier, 120);

    // Cache challenge in deviceStore for rapid lookup
    deviceStore.challengeCache.set(challenge.challengeId, challenge);

    return NextResponse.json(challenge, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Challenge API Error]:', error);
    return NextResponse.json({ error: 'Failed to generate cryptographic challenge' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = (searchParams.get('identifier') || searchParams.get('email') || 'demo-client').toLowerCase().trim();

    const challenge = createChallenge(identifier, 120);
    deviceStore.challengeCache.set(challenge.challengeId, challenge);

    return NextResponse.json(challenge, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal challenge error' }, { status: 500 });
  }
}
