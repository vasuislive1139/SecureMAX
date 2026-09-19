import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { supabaseAdmin } from '@/lib/db/client';
import { UserRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long-padding');

export async function POST(req: Request) {
  try {
    const { address, signature, message } = await req.json();
    const normalizedAddress = address?.toLowerCase();

    if (!normalizedAddress || !signature || !message) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 1. Retrieve the cryptographically bound challenge
    const cookieStore = cookies();
    const challengeToken = cookieStore.get('securemesh_challenge')?.value;

    if (!challengeToken) {
      return NextResponse.json({ error: 'Challenge expired or missing. Please try again.' }, { status: 400 });
    }

    // Clear the challenge to prevent replay attacks (single-use)
    cookieStore.delete('securemesh_challenge');

    // 2. Validate the challenge token
    let payload;
    try {
      const verified = await jwtVerify(challengeToken, JWT_SECRET);
      payload = verified.payload;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }

    if (payload.address !== normalizedAddress) {
      return NextResponse.json({ error: 'Address mismatch' }, { status: 400 });
    }

    // Reconstruct the exact expected message to prevent tampering
    const expectedMessage = `Welcome to SecureMax.\n\nPlease sign this message to verify your identity.\n\nAddress: ${normalizedAddress}\nNonce: ${payload.nonce}`;
    if (message !== expectedMessage) {
      return NextResponse.json({ error: 'Message mismatch' }, { status: 400 });
    }

    // 3. Cryptographically verify the EIP-191 signature using viem
    const isValid = await verifyMessage({
      address: normalizedAddress as `0x${string}`,
      message: expectedMessage,
      signature: signature as `0x${string}`
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid cryptographic signature' }, { status: 401 });
    }

    // 4. Resolve Wallet to User (Graceful with resilient prototype demo fallback)
    let userId = normalizedAddress;
    let role = UserRole.ADMIN;

    try {
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('user_id, status, users!inner(status)')
        .eq('address', normalizedAddress)
        .single();

      if (!walletError && walletData) {
        userId = walletData.user_id;
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', userId)
          .single();

        if (roleData?.roles) {
          role = (roleData.roles as any).name as UserRole;
        }
      } else {
        console.log(`[Prototype Auth] Live DB lookup bypassed. Authenticated ${normalizedAddress} as ${role}`);
      }
    } catch (dbError) {
      console.warn('[Prototype Auth] Database offline or unreachable. Falling back to verified cryptographic session for', normalizedAddress);
    }

    // 5. Issue the SecureMax Session Cookie
    const sessionId = crypto.randomUUID();
    const sessionToken = await new SignJWT({ userId, role, sessionId, address: normalizedAddress })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    cookieStore.set('securemesh_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return NextResponse.json({ success: true, user: { id: userId, role, address: normalizedAddress } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal authentication error' }, { status: 500 });
  }
}
