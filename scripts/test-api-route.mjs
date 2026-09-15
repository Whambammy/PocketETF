import { NextRequest } from 'next/server';
import { POST, resolveETF } from '../src/app/api/actions/etf/[id]/route.ts';

async function testApiRoute() {
  console.log('====================================================');
  console.log('   Testing PocketETF Action POST API Route Handler  ');
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

  // Test 1: Zero-Gas Guardrail on Live Unfunded Wallet
  console.log('--- Test 1: Unfunded Wallet (Zero-Gas Protection) ---');
  const req1 = new NextRequest('http://localhost:3000/api/actions/etf/silicon-ai?amount=50', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: '11111111111111111111111111111111' }),
  });
  const res1 = await POST(req1, { params: { id: 'silicon-ai' } });
  const data1 = await res1.json();
  assert('Unfunded account returns HTTP 400 Bad Request', res1.status === 400);
  assert('Error message specifically cites Insufficient USDC', data1.message?.includes('Insufficient USDC'));
  assert('Error advises swapping SOL to USDC or picking smaller amount', data1.message?.includes('swap SOL to USDC'));
  assert('No transaction is returned (Phantom popup blocked, 0 SOL lost)', data1.transaction === undefined);

  // Test 2: Incompatible 3-DEX combination
  console.log('\n--- Test 2: Incompatible 3-DEX Custom ETF ---');
  const req2 = new NextRequest(
    'http://localhost:3000/api/actions/etf/custom?assets=NVDA:40,TSM:30,AAPL:30&amount=50&simulate=true',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: '11111111111111111111111111111111' }),
    }
  );
  const res2 = await POST(req2, { params: { id: 'custom' } });
  const data2 = await res2.json();
  assert('Conflicting 3-DEX basket returns HTTP 400 Bad Request', res2.status === 400);
  assert('Message cites 3-DEX Conflict / 1232B MTU packet limit', data2.message?.includes('3-DEX Conflict') || data2.message?.includes('1232B'));
  assert('No transaction is returned', data2.transaction === undefined);

  // Test 3: Compatible 3-DEX combination (Simulation Mode: NVDA + JUP + SOL)
  console.log('\n--- Test 3: Compatible 3-DEX Custom ETF (Simulation: NVDA + JUP + SOL) ---');
  const req3 = new NextRequest(
    'http://localhost:3000/api/actions/etf/custom?assets=NVDA:40,JUP:30,SOL:30&amount=50&simulate=true',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: '11111111111111111111111111111111' }),
    }
  );
  const res3 = await POST(req3, { params: { id: 'custom' } });
  const data3 = await res3.json();
  console.log('Test 3 Status:', res3.status, 'Response:', data3);
  assert('Compatible 3-stock basket simulation returns HTTP 200 OK', res3.status === 200);
  assert('Transaction string is returned', typeof data3.transaction === 'string');
  assert('Type is "transaction"', data3.type === 'transaction');

  console.log('\n====================================================');
  console.log(`Route Test Results: ${passed} Passed | ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testApiRoute().catch((err) => {
  console.error('API route test error:', err);
  process.exit(1);
});
