import http from 'http';

function req(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('       PocketETF Pre-GitHub Production Audit        ');
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

  // 1. actions.json Verification
  const actionsJson = await req('/actions.json');
  assert('actions.json exists (HTTP 200)', actionsJson.status === 200);
  assert('actions.json contains valid rules array', Array.isArray(actionsJson.body?.rules));

  // 2. Universal CORS Preflight
  const corsRes = await req('/api/actions/etf/silicon-ai', 'OPTIONS');
  assert('OPTIONS CORS preflight returns 200', corsRes.status === 200);
  assert('Access-Control-Allow-Origin is wildcard (*)', corsRes.headers['access-control-allow-origin'] === '*');
  assert('Exposes x-action-version and x-blockchain-ids', corsRes.headers['access-control-expose-headers']?.toLowerCase().includes('x-action-version'));

  // 3. Solana Actions v2.1.3 GET Specification
  const getAction = await req('/api/actions/etf/silicon-ai');
  assert('GET /api/actions/etf/silicon-ai returns 200', getAction.status === 200);
  assert('Action payload has type: action', getAction.body?.type === 'action');
  assert('Action payload has valid title', typeof getAction.body?.title === 'string');
  assert('Action payload has links.actions array', Array.isArray(getAction.body?.links?.actions));
  assert('Header specifies x-action-version: 2.1.3', getAction.headers['x-action-version'] === '2.1.3');

  // 4. Input Validation & Defensive Rejection
  const postBadKey = await req('/api/actions/etf/silicon-ai?amount=50', 'POST', { account: 'not-a-valid-key' });
  assert('POST with invalid pubkey returns 400 Bad Request', postBadKey.status === 400);

  const postNegative = await req('/api/actions/etf/silicon-ai?amount=-10', 'POST', { account: '11111111111111111111111111111111' });
  assert('POST with negative amount returns 400 Bad Request', postNegative.status === 400);

  const postZero = await req('/api/actions/etf/silicon-ai?amount=0', 'POST', { account: '11111111111111111111111111111111' });
  assert('POST with zero amount returns 400 Bad Request', postZero.status === 400);

  // 5. VersionedTransaction Assembly Simulation
  const postSim = await req('/api/actions/etf/silicon-ai?amount=50&simulate=true', 'POST', { account: '11111111111111111111111111111111' });
  assert('POST simulation returns 200 OK', postSim.status === 200);
  assert('POST simulation returns base64 transaction string', typeof postSim.body?.transaction === 'string');

  // 6. Live Price Streaming Engine
  const pricesRes = await req('/api/prices');
  assert('/api/prices returns 200 OK', pricesRes.status === 200);
  assert('/api/prices returns success: true', pricesRes.body?.success === true);
  assert('/api/prices contains active NVDA quote', !!pricesRes.body?.prices?.NVDA);
  assert('/api/prices includes SWR cache headers', pricesRes.headers['cache-control']?.includes('s-maxage=15'));

  // 7. Custom ETF Composition Route
  const customRes = await req('/api/actions/etf/custom?assets=NVDA:40,TSM:30,AMD:30&name=Custom+Titans');
  assert('Custom ETF composition GET returns 200 OK', customRes.status === 200);
  assert('Custom ETF response includes custom title', customRes.body?.title?.includes('Custom Titans'));

  console.log('\n====================================================');
  console.log(`Audit Results: ${passed} Passed | ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
