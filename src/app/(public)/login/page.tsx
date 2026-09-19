'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useConnect, useSignMessage, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ShieldAlert, Key, Server, Layers, Shield, Sparkles } from 'lucide-react';
import { UserRole } from '@/types';

type AuthState = 'IDLE' | 'CONNECTING' | 'WAITING_FOR_SIGNATURE' | 'VERIFYING' | 'AUTHENTICATED' | 'FAILED';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address && (authState === 'IDLE' || authState === 'CONNECTING')) {
      handleAuthentication(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, authState]);

  const handleConnect = async () => {
    setErrorMessage('');
    setAuthState('CONNECTING');
    try {
      const connector = connectors.find(c => c.id === 'injected' || c.id === 'metaMask') || connectors[0];
      if (!connector) throw new Error('No wallet connector available');
      connect({ connector });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect wallet');
      setAuthState('FAILED');
    }
  };

  const handleAuthentication = async (walletAddress: string) => {
    try {
      // 1. Get Challenge
      setAuthState('WAITING_FOR_SIGNATURE');
      const challengeRes = await fetch(`/api/auth/challenge?address=${walletAddress}`);
      if (!challengeRes.ok) {
        throw new Error((await challengeRes.json()).error || 'Failed to get challenge');
      }
      const { message } = await challengeRes.json();

      // 2. Sign Message
      const signature = await signMessageAsync({ message });

      // 3. Verify Signature & Login
      setAuthState('VERIFYING');
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, signature, message }),
      });

      if (!loginRes.ok) {
        throw new Error((await loginRes.json()).error || 'Authentication failed');
      }

      const { user } = await loginRes.json();
      setAuthState('AUTHENTICATED');

      // 4. Redirect
      setTimeout(() => {
        if (user.role === 'ADMIN') router.push('/dashboard/admin');
        else if (user.role === 'AUDITOR') router.push('/dashboard/auditor');
        else router.push('/dashboard/user');
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Authentication failed');
      setAuthState('FAILED');
      disconnect();
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setDemoLoading(role);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error('Demo login failed');

      if (role === UserRole.ADMIN) {
        router.push('/dashboard/admin');
      } else if (role === UserRole.AUDITOR) {
        router.push('/dashboard/auditor');
      } else {
        router.push('/dashboard/user');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize demo session');
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-zinc-800 bg-[#0a0a0c]/90 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-cyan-500/10 flex items-center justify-center rounded-full mb-3 border border-cyan-500/20">
            <Key className="w-6 h-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">SecureMax Login</CardTitle>
          <CardDescription className="text-zinc-400 text-xs font-mono">
            Authenticate using Web3 Wallet or Instant Demo Session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center pb-6">

          {/* WEB3 WALLET LOGIN */}
          {authState === 'IDLE' && (
            <Button 
              onClick={handleConnect} 
              className="w-full max-w-[280px] bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              <Key className="w-4 h-4 mr-2" />
              Connect MetaMask
            </Button>
          )}

          {authState === 'CONNECTING' && (
            <div className="flex flex-col items-center text-zinc-400 py-2">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-cyan-400" />
              <p className="text-xs font-mono">Connecting wallet...</p>
            </div>
          )}

          {authState === 'WAITING_FOR_SIGNATURE' && (
            <div className="flex flex-col items-center text-amber-400 py-2">
              <ShieldCheck className="w-8 h-8 mb-2 animate-pulse" />
              <p className="text-xs font-mono">Please sign the message in MetaMask</p>
            </div>
          )}

          {authState === 'VERIFYING' && (
            <div className="flex flex-col items-center text-cyan-400 py-2">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-xs font-mono">Verifying cryptographic signature...</p>
            </div>
          )}

          {authState === 'AUTHENTICATED' && (
            <div className="flex flex-col items-center text-emerald-400 py-2">
              <ShieldCheck className="w-8 h-8 mb-2" />
              <p className="text-xs font-mono">Authentication Successful — Redirecting...</p>
            </div>
          )}

          {authState === 'FAILED' && (
            <div className="flex flex-col items-center text-destructive text-center space-y-3">
              <ShieldAlert className="w-8 h-8" />
              <p className="text-xs font-mono">{errorMessage}</p>
              <Button variant="outline" onClick={() => {
                disconnect();
                setAuthState('IDLE');
              }} className="w-full max-w-[250px] text-xs font-mono">
                Try Again
              </Button>
            </div>
          )}

          {/* ONE-CLICK DEMO ACCESS FOR JUDGES & EVALUATION */}
          <div className="w-full border-t border-zinc-800/80 pt-4 flex flex-col items-center space-y-3">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              One-Click Evaluation Access
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
              <Button 
                variant="outline" 
                size="sm"
                disabled={Boolean(demoLoading)}
                onClick={() => handleDemoLogin(UserRole.ADMIN)}
                className="border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-zinc-200 text-xs font-mono"
              >
                {demoLoading === UserRole.ADMIN ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Shield className="w-3 h-3 mr-1.5 text-cyan-400" />}
                Admin
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                disabled={Boolean(demoLoading)}
                onClick={() => handleDemoLogin(UserRole.AUDITOR)}
                className="border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-zinc-200 text-xs font-mono"
              >
                {demoLoading === UserRole.AUDITOR ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Layers className="w-3 h-3 mr-1.5 text-emerald-400" />}
                Auditor
              </Button>
            </div>
          </div>

          {/* DIRECT NAVIGATION SHORTCUTS */}
          <div className="w-full border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 px-2">
            <Link href="/" className="hover:text-cyan-400 transition-colors">
              Command Center
            </Link>
            <span>•</span>
            <Link href="/infrastructure" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Server className="w-3 h-3 text-cyan-400" />
              Sepolia Live
            </Link>
            <span>•</span>
            <Link href="/assets" className="hover:text-cyan-400 transition-colors">
              Assets
            </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
