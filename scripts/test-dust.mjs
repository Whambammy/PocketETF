import assert from 'node:assert';

const USDC_ATOMIC_PER_UNIT = 1_000_000;
const MAX_BASKET_ASSETS = 3;

function calculateAssetAllocations(usdcAmount, assets) {
  if (usdcAmount <= 0) {
    throw new Error('USDC amount must be greater than 0.');
  }
  if (!assets || assets.length === 0) {
    throw new Error('Basket must contain at least 1 asset.');
  }
  if (assets.length > MAX_BASKET_ASSETS) {
    throw new Error(`Basket exceeds maximum limit of ${MAX_BASKET_ASSETS} assets.`);
  }

  const totalUsdcAtomic = Math.round(usdcAmount * USDC_ATOMIC_PER_UNIT);

  let allocatedSum = 0;
  let highestWeightIdx = 0;
  let highestWeight = -1;

  const rawSubAmounts = assets.map((asset, index) => {
    if (asset.weightPercent > highestWeight) {
      highestWeight = asset.weightPercent;
      highestWeightIdx = index;
    }
    const subAmount = Math.floor(totalUsdcAtomic * (asset.weightPercent / 100));
    allocatedSum += subAmount;
    return subAmount;
  });

  // Assign residual dust to highest-weighted asset
  const dustRemainder = totalUsdcAtomic - allocatedSum;
  if (dustRemainder > 0 && highestWeightIdx >= 0) {
    rawSubAmounts[highestWeightIdx] += dustRemainder;
  }

  const allocations = assets.map((asset, index) => ({
    ticker: asset.ticker,
    weightPercent: asset.weightPercent,
    subAmountAtomic: rawSubAmounts[index],
  }));

  return { totalUsdcAtomic, allocations, dustRemainder };
}

console.log('Testing Decimal Truncation & Zero-Dust Allocation...');

// Test 1: $25 split across 34% AAPL, 33% MSFT, 33% GOOGL
const res1 = calculateAssetAllocations(25, [
  { ticker: 'AAPL', weightPercent: 34 },
  { ticker: 'MSFT', weightPercent: 33 },
  { ticker: 'GOOGL', weightPercent: 33 },
]);
const sum1 = res1.allocations.reduce((acc, a) => acc + a.subAmountAtomic, 0);
assert.strictEqual(sum1, res1.totalUsdcAtomic, 'Sum must exactly equal total atomic USDC');
console.log('✓ Test 1 Passed: $25 across (34%, 33%, 33%) => sum =', sum1, 'atomic units (exact match)');

// Test 2: $10.01 split across 33.33% weights (fractional remainder edge case)
const res2 = calculateAssetAllocations(10.01, [
  { ticker: 'NVDA', weightPercent: 33.34 },
  { ticker: 'TSM', weightPercent: 33.33 },
  { ticker: 'AMD', weightPercent: 33.33 },
]);
const sum2 = res2.allocations.reduce((acc, a) => acc + a.subAmountAtomic, 0);
assert.strictEqual(sum2, res2.totalUsdcAtomic, 'Sum must exactly equal total atomic USDC with fractional weights');
console.log('✓ Test 2 Passed: $10.01 across (33.34%, 33.33%, 33.33%) => sum =', sum2, 'atomic units (exact match)');

// Test 3: $33.33 across 50% / 50%
const res3 = calculateAssetAllocations(33.33, [
  { ticker: 'NVDA', weightPercent: 50 },
  { ticker: 'TSM', weightPercent: 50 },
]);
const sum3 = res3.allocations.reduce((acc, a) => acc + a.subAmountAtomic, 0);
assert.strictEqual(sum3, res3.totalUsdcAtomic, 'Sum must match for odd dollar amounts');
console.log('✓ Test 3 Passed: $33.33 across 50/50 => sum =', sum3, 'atomic units (exact match)');

// Test 4: $100 across 100% SPY
const res4 = calculateAssetAllocations(100, [
  { ticker: 'SPY', weightPercent: 100 },
]);
const sum4 = res4.allocations.reduce((acc, a) => acc + a.subAmountAtomic, 0);
assert.strictEqual(sum4, res4.totalUsdcAtomic);
console.log('✓ Test 4 Passed: $100 across 100% => sum =', sum4, 'atomic units (exact match)');

console.log('\nALL DUST ELIMINATION TESTS PASSED 100%!\n');
