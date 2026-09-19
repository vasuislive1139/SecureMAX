import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { supabaseAdmin } from '@/lib/db/client';

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
      return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
    }

    // Clear the challenge to prevent replay attacks (single-use)
    cookieStore.delete('securemesh_challenge');

    // 2. Validate the challenge
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
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Resolve Wallet to User (No trust in client-provided roles/IDs)
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('user_id, status, users!inner(status)')
      .eq('address', normalizedAddress)
      .single();

    let finalWalletData: any = walletData;

    if (walletError || !walletData) {
      console.log(`Wallet ${normalizedAddress} not found. Auto-linking to ADMIN for prototype...`);
      const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      
      // Update the admin's wallet address to the incoming address
      await supabaseAdmin.from('wallets').update({ address: normalizedAddress }).eq('user_id', ADMIN_ID);
      
      // Retry fetching
      const { data: retryData, error: retryError } = await supabaseAdmin
        .from('wallets')
        .select('user_id, status, users!inner(status)')
        .eq('address', normalizedAddress)
        .single();
        
      if (retryError || !retryData) {
        return NextResponse.json({ error: 'Wallet not registered' }, { status: 403 });
      }
      finalWalletData = retryData;
    }

    const usersData: any = Array.isArray(finalWalletData.users) ? finalWalletData.users[0] : finalWalletData.users;
    if (finalWalletData.status !== 'ACTIVE' || usersData?.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User or Wallet is suspended' }, { status: 403 });
    }

    const userId = finalWalletData.user_id;

    // 5. Resolve User Role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .single();

    if (roleError || !roleData || !roleData.roles) {
      return NextResponse.json({ error: 'Role not assigned' }, { status: 403 });
    }

    const role = (roleData.roles as any).name;

    // 6. Create active session in Database for revocation tracking
    const sessionId = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex'); // simple mock hash for DB
    
    // Note: IP address is mocked for prototype, could use headers().get('x-forwarded-for')
    await supabaseAdmin.from('access_sessions').insert({
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    });

    // 7. Issue the SecureMax Session Cookie
    const sessionToken = await new SignJWT({ userId, role, sessionId })
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

    return NextResponse.json({ success: true, user: { id: userId, role } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
