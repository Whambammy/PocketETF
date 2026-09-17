import { NextRequest } from 'next/server';
import { GET, POST, resolveETF } from '../src/app/api/actions/etf/[id]/route.ts';
import { GET as getPrices } from '../src/app/api/prices/route.ts';

async function testApiRoute() {
  console.log('====================================================');
  console.log('   Testing PocketETF Action API & Pyth Route Handler');
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

  // Test 1: GET Action Metadata for Silicon AI
  console.log('--- Test 1: GET Action Spec (Silicon AI) ---');
  const getReq1 = new NextRequest('http://localhost:3000/api/actions/etf/silicon-ai');
  const getRes1 = await GET(getReq1, { params: { id: 'silicon-ai' } });
  const getData1 = await getRes1.json();
  assert('GET silicon-ai returns HTTP 200', getRes1.status === 200);
  assert('Has type "action"', getData1.type === 'action');
  assert('Has valid title', typeof getData1.title === 'string' && getData1.title.length > 0);
  assert('Has 6 action options (5 presets + custom input parameter)', getData1.links?.actions?.length === 6);
  assert('Has x-action-version: 2.1.3 header', getRes1.headers.get('x-action-version') === '2.1.3');
  assert('Has wildcard CORS header', getRes1.headers.get('access-control-allow-origin') === '*');

  // Test 2: GET Action Metadata for Backpack Titans
  console.log('\n--- Test 2: GET Action Spec (Backpack Titans) ---');
  const getReq2 = new NextRequest('http://localhost:3000/api/actions/etf/backpack-titans');
  const getRes2 = await GET(getReq2, { params: { id: 'backpack-titans' } });
  const getData2 = await getRes2.json();
  assert('GET backpack-titans returns HTTP 200', getRes2.status === 200);
  assert('Backpack Titans has NVDA and MSTR holdings', getData2.description?.includes('NVDA') && getData2.description?.includes('MSTR'));

  // Test 3: Zero-Gas Guardrail on Live Unfunded Wallet
  console.log('\n--- Test 3: Unfunded Wallet (Zero-Gas Protection) ---');
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

  // Test 4: Incompatible 3-DEX combination
  console.log('\n--- Test 4: Incompatible 3-DEX Custom ETF ---');
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

  // Test 5: Compatible 3-DEX combination (Simulation Mode: NVDA + JUP + SOL)
  console.log('\n--- Test 5: Compatible 3-DEX Custom ETF (Simulation: NVDA + JUP + SOL) ---');
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
  assert('Compatible 3-stock basket simulation returns HTTP 200 OK', res3.status === 200);
  assert('Transaction string is returned', typeof data3.transaction === 'string');
  assert('Type is "transaction"', data3.type === 'transaction');

  // Test 6: Pyth /api/prices Endpoint
  console.log('\n--- Test 6: Pyth /api/prices Endpoint ---');
  const priceReq = new NextRequest('http://localhost:3000/api/prices');
  const priceRes = await getPrices(priceReq);
  const priceData = await priceRes.json();
  assert('/api/prices returns HTTP 200 OK', priceRes.status === 200);
  assert('/api/prices success is true', priceData.success === true);
  assert('/api/prices sources Pyth Network Hermes', priceData.source?.includes('Pyth'));
  assert('Contains quotes for NVDA', !!priceData.prices?.NVDA && priceData.prices.NVDA.price > 0);
  assert('NVDA has Pyth confidence interval', typeof priceData.prices?.NVDA?.formattedConfidence === 'string');
  assert('Contains quotes for MSTR', !!priceData.prices?.MSTR && priceData.prices.MSTR.price > 0);
  assert('Has 25 catalog assets covered', Object.keys(priceData.prices || {}).length >= 24);

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
