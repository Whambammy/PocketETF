import { TOKEN_CATALOG, CURATED_ETFS, DEFAULT_PLATFORM_FEE_BPS, CREATOR_FEE_SPLIT_PERCENT } from '../src/lib/constants.ts';
import { getPythPricesForAssets, calculatePythBasketNAV, PYTH_FEED_IDS } from '../src/lib/pyth.ts';

async function runPythTests() {
  console.log('====================================================');
  console.log('   Testing Pyth Network Hermes Oracles & Basket NAV  ');
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

  // Suite 1: Pyth Feed ID Verification
  console.log('--- Test Suite 1: Pyth Feed ID Mappings ---');
  assert('Pyth Feed ID registry has feeds', Object.keys(PYTH_FEED_IDS).length > 0);
  assert('NVDA has Pyth Feed ID', typeof PYTH_FEED_IDS['NVDA'] === 'string' && PYTH_FEED_IDS['NVDA'].startsWith('0x') && PYTH_FEED_IDS['NVDA'].length === 66);
  assert('TSM has Pyth Feed ID', typeof PYTH_FEED_IDS['TSM'] === 'string' && PYTH_FEED_IDS['TSM'].startsWith('0x') && PYTH_FEED_IDS['TSM'].length === 66);
  assert('MSTR has Pyth Feed ID', typeof PYTH_FEED_IDS['MSTR'] === 'string' && PYTH_FEED_IDS['MSTR'].startsWith('0x') && PYTH_FEED_IDS['MSTR'].length === 66);
  assert('AAPL has Pyth Feed ID', typeof PYTH_FEED_IDS['AAPL'] === 'string' && PYTH_FEED_IDS['AAPL'].startsWith('0x') && PYTH_FEED_IDS['AAPL'].length === 66);
  assert('SPY has Pyth Feed ID', typeof PYTH_FEED_IDS['SPY'] === 'string' && PYTH_FEED_IDS['SPY'].startsWith('0x') && PYTH_FEED_IDS['SPY'].length === 66);
  assert('SOL has Pyth Feed ID', typeof PYTH_FEED_IDS['SOL'] === 'string' && PYTH_FEED_IDS['SOL'].startsWith('0x') && PYTH_FEED_IDS['SOL'].length === 66);

  // Suite 2: Token Catalog Feed Coverage
  console.log('\n--- Test Suite 2: Catalog Pyth Integration ---');
  const catalogAssetsWithPyth = TOKEN_CATALOG.filter((a) => a.pythFeedId);
  assert(
    `All ${TOKEN_CATALOG.length} catalog assets have Pyth feed IDs`,
    catalogAssetsWithPyth.length === TOKEN_CATALOG.length,
    `Found ${catalogAssetsWithPyth.length}/${TOKEN_CATALOG.length}`
  );

  const mstrAsset = TOKEN_CATALOG.find((a) => a.ticker === 'MSTR');
  assert('MSTR (Backpack/Sunrise Tokenized Stock) exists in catalog', !!mstrAsset);
  assert('MSTR has valid mint address', !!mstrAsset?.mint && mstrAsset.mint.length >= 32);

  // Suite 3: Price Fetching & Confidence Intervals
  console.log('\n--- Test Suite 3: Price Fetching & Confidence Intervals ---');
  const testAssets = [
    TOKEN_CATALOG.find((a) => a.ticker === 'NVDA'),
    TOKEN_CATALOG.find((a) => a.ticker === 'TSM'),
    TOKEN_CATALOG.find((a) => a.ticker === 'MSTR'),
  ].filter(Boolean);

  const priceMap = await getPythPricesForAssets(testAssets);
  assert('Price map returned for all assets', Object.keys(priceMap).length === testAssets.length);

  for (const asset of testAssets) {
    const p = priceMap[asset.ticker];
    assert(`${asset.ticker} has numeric price > 0`, p && p.price > 0, `Price: ${p?.price}`);
    assert(`${asset.ticker} has confidence interval (±sigma)`, p && p.confidence >= 0, `Conf: ${p?.confidence}`);
    assert(`${asset.ticker} has formatted price string`, p && typeof p.formatted === 'string' && p.formatted.startsWith('$'));
    assert(`${asset.ticker} has formatted confidence string`, p && typeof p.formattedConfidence === 'string' && p.formattedConfidence.startsWith('±$'));
    assert(`${asset.ticker} confidence is within 2% of spot price`, p && p.confidence <= p.price * 0.02);
  }

  // Suite 4: Pyth Basket NAV Calculations
  console.log('\n--- Test Suite 4: Dynamic Basket NAV Calculations ---');
  const siliconAi = CURATED_ETFS['silicon-ai'];
  assert('Curated ETF silicon-ai found', !!siliconAi);

  const siliconPrices = await getPythPricesForAssets(siliconAi.targetAssets);
  const navResult10 = calculatePythBasketNAV(siliconAi.id, siliconAi.targetAssets, siliconPrices);
  assert('NAV basket has valid positive NAV', navResult10.basketNav > 0);
  assert('NAV aggregate confidence is computed', navResult10.aggregateConfidence > 0);
  assert('NAV confidence formatted string is present', navResult10.formattedConfidence.startsWith('±$'));
  assert('NAV source is Pyth Hermes', navResult10.source.includes('Pyth'));
  assert('Breakdown includes NVDA and TSM', navResult10.assetBreakdown.length === 2);

  const backpackTitans = CURATED_ETFS['backpack-titans'];
  assert('Curated ETF backpack-titans found', !!backpackTitans);

  const titansPrices = await getPythPricesForAssets(backpackTitans.targetAssets);
  const navTitans = calculatePythBasketNAV(backpackTitans.id, backpackTitans.targetAssets, titansPrices);
  assert('NAV for titans is valid positive NAV', navTitans.basketNav > 0);
  assert('Titans breakdown contains NVDA and MSTR', navTitans.assetBreakdown.some(a => a.ticker === 'NVDA') && navTitans.assetBreakdown.some(a => a.ticker === 'MSTR'));

  // Suite 5: Protocol Fee & Creator Monetization Invariants
  console.log('\n--- Test Suite 5: Protocol Monetization Guardrails ---');
  assert('Default platform fee is 0 bps (Hackathon Alpha requirement)', DEFAULT_PLATFORM_FEE_BPS === 0);
  assert('Creator affiliate split is 50%', CREATOR_FEE_SPLIT_PERCENT === 50);

  // In production simulation: 15 bps on $10,000 swap
  const simulatedTradeUsdc = 10000;
  const simulatedFeeBps = 15;
  const totalFeeUsdc = (simulatedTradeUsdc * simulatedFeeBps) / 10000; // $15
  const creatorShareUsdc = (totalFeeUsdc * CREATOR_FEE_SPLIT_PERCENT) / 100; // $7.50
  const protocolShareUsdc = totalFeeUsdc - creatorShareUsdc; // $7.50

  assert('Simulated 15 bps fee on $10k yields $15 total', totalFeeUsdc === 15);
  assert('Creator receives exactly 50% ($7.50)', creatorShareUsdc === 7.5);
  assert('Protocol treasury receives exactly 50% ($7.50)', protocolShareUsdc === 7.5);

  console.log('\n====================================================');
  console.log(`   Tests Finished: ${passed} Passed | ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPythTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
