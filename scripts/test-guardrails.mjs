import { PublicKey } from '@solana/web3.js';
import {
  TOKEN_CATALOG,
  getDEXConflictStatus,
  USDC_MINT_ADDRESS,
} from '../src/lib/constants.ts';
import { getSolanaConnection, getOnChainTokenBalance } from '../src/lib/solana.ts';
import { calculateAssetAllocations } from '../src/lib/jupiter.ts';

async function runTests() {
  console.log('====================================================');
  console.log('   Testing PocketETF Guardrails & MTU Compatibility  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${extra}`);
      failed++;
    }
  }

  // 1. DEX Conflict Guardrail Tests
  console.log('--- Test Suite 1: DEX Venue MTU Guardrail ---');

  // 1a. 1 Asset (always compatible)
  const oneAsset = [TOKEN_CATALOG.find(t => t.ticker === 'NVDA')];
  const res1 = getDEXConflictStatus(oneAsset);
  assert('1 Asset basket is compatible', res1.isCompatible === true);

  // 1b. 2 Assets (always compatible <= 1,232B)
  const twoAssets = [
    TOKEN_CATALOG.find(t => t.ticker === 'NVDA'),
    TOKEN_CATALOG.find(t => t.ticker === 'TSM'),
  ];
  const res2 = getDEXConflictStatus(twoAssets);
  assert('2 Asset basket is compatible', res2.isCompatible === true);

  // 1c. 3 Assets on 1 DEX (NVDA, GOOGL, META all on Whirlpool)
  const threeSameDex = [
    TOKEN_CATALOG.find(t => t.ticker === 'NVDA'),
    TOKEN_CATALOG.find(t => t.ticker === 'GOOGL'),
    TOKEN_CATALOG.find(t => t.ticker === 'META'),
  ];
  const res3 = getDEXConflictStatus(threeSameDex);
  assert('3 Assets on same DEX (Whirlpool) is compatible', res3.isCompatible === true);
  assert('Unique DEX count is 1', res3.uniqueDexes.length === 1);
  assert('Estimated bytes is ~1,002B <= 1,232B', res3.estimatedBytes <= 1232);

  // 1d. 3 Assets across 2 DEXes (NVDA: Whirlpool, GOOGL: Whirlpool, TSM: Meteora)
  const threeTwoDexes = [
    TOKEN_CATALOG.find(t => t.ticker === 'NVDA'),
    TOKEN_CATALOG.find(t => t.ticker === 'GOOGL'),
    TOKEN_CATALOG.find(t => t.ticker === 'TSM'),
  ];
  const res4 = getDEXConflictStatus(threeTwoDexes);
  assert('3 Assets across 2 DEXes (Whirlpool + Meteora) is compatible', res4.isCompatible === true);
  assert('Unique DEX count is 2', res4.uniqueDexes.length === 2);
  assert('Estimated bytes is ~1,154B <= 1,232B', res4.estimatedBytes <= 1232);

  // 1e. 3 Assets across 3 DEXes (NVDA: Whirlpool, TSM: Meteora, AAPL: Raydium)
  const threeConflictDexes = [
    TOKEN_CATALOG.find(t => t.ticker === 'NVDA'),
    TOKEN_CATALOG.find(t => t.ticker === 'TSM'),
    TOKEN_CATALOG.find(t => t.ticker === 'AAPL'),
  ];
  const res5 = getDEXConflictStatus(threeConflictDexes);
  assert('3 Assets across 3 conflicting DEXes is REJECTED', res5.isCompatible === false);
  assert('Unique DEX count is 3', res5.uniqueDexes.length === 3);
  assert('Reason explains 3-DEX AMM MTU Conflict', res5.reason?.includes('3-DEX Conflict'));
  assert('Estimated bytes > 1,232B MTU limit', res5.estimatedBytes > 1232);

  // 2. Allocation Math for 3-Asset Baskets
  console.log('\n--- Test Suite 2: Multi-Asset Allocations Math ---');
  const allocs = calculateAssetAllocations(100, [
    { ...threeSameDex[0], weightPercent: 34 },
    { ...threeSameDex[1], weightPercent: 33 },
    { ...threeSameDex[2], weightPercent: 33 },
  ]);
  assert('3-Asset Allocation total atomic is exactly 100,000,000 units ($100 USDC)', allocs.totalUsdcAtomic === 100_000_000);
  const sumAtomic = allocs.allocations.reduce((acc, a) => acc + a.subAmountAtomic, 0);
  assert('Sum of all subAmountAtomic matches totalUsdcAtomic exactly (zero dust loss)', sumAtomic === 100_000_000);

  // 3. On-Chain Zero-Gas Wallet Guardrail Test
  console.log('\n--- Test Suite 3: On-Chain Zero-Gas Wallet Guardrail ---');
  const connection = getSolanaConnection();
  const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
  const emptyWallet = new PublicKey('11111111111111111111111111111111');

  const emptyBalance = await getOnChainTokenBalance(connection, emptyWallet, usdcMint);
  assert('Unfunded / empty wallet returns uiAmount: 0', emptyBalance.uiAmount === 0);
  assert('Unfunded / empty wallet returns exists: false', emptyBalance.exists === false);
  assert('Unfunded / empty wallet returns balanceAtomic: 0n', emptyBalance.balanceAtomic === 0n);

  console.log('\n====================================================');
  console.log(`Test Results: ${passed} Passed | ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
