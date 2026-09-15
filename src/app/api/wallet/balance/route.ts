import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getSolanaConnection } from '@/lib/solana';
import { USDC_MINT_ADDRESS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const account = url.searchParams.get('account');
    if (!account) {
      return NextResponse.json({ error: 'Missing account parameter' }, { status: 400 });
    }

    let ownerPubkey: PublicKey;
    try {
      ownerPubkey = new PublicKey(account);
    } catch {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    const connection = getSolanaConnection();

    // Fetch SOL balance
    const solLamports = await connection.getBalance(ownerPubkey);
    const sol = solLamports / 1_000_000_000;

    // Fetch USDC balance
    let usdc = 0;
    try {
      const usdcAta = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT_ADDRESS),
        ownerPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const tokenBal = await connection.getTokenAccountBalance(usdcAta);
      usdc = tokenBal.value.uiAmount || 0;
    } catch {
      // ATA might not exist yet -> balance is 0
      usdc = 0;
    }

    return NextResponse.json({
      success: true,
      account,
      sol,
      usdc,
      formattedUsdc: `$${usdc.toFixed(2)}`,
      formattedSol: `${sol.toFixed(4)} SOL`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
