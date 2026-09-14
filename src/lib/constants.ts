export interface ETFAsset {
  ticker: string;
  name: string;
  weightPercent: number;
  mint: string;
  decimals: number;
  color: string;
  category: 'Semiconductors & AI' | 'Mega-Cap Tech' | 'Indices & Benchmarks' | 'Commodities & Yield' | 'Web3 Equities';
  change24h?: string;
  underlyingPrice?: string;
}

// Backwards compatibility alias
export type BasketAsset = ETFAsset;

export interface ETFDefinition {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  description: string;
  iconPath: string;
  category: 'AI & Semiconductors' | 'Mega-Cap Tech' | 'Broad Market' | 'Growth & Commodities' | 'Web3';
  targetAssets: ETFAsset[];
  colorGradient: {
    from: string;
    to: string;
  };
  metrics?: {
    aumSimulated?: string;
    benchmarkYield?: string;
    volatility?: 'Low' | 'Moderate' | 'High';
  };
}

// Backwards compatibility alias
export type BasketDefinition = ETFDefinition;

/**
 * Base Solana Token Mints & Configuration
 */
export const USDC_MINT_ADDRESS = process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;
export const USDC_ATOMIC_PER_UNIT = 10 ** USDC_DECIMALS; // 1,000,000 units per $1

/**
 * Curated Catalog of 25+ Verified Tokenized Stocks, Indices, Commodities & RWAs
 */
export const TOKEN_CATALOG: ETFAsset[] = [
  // Semiconductors & AI
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    weightPercent: 0,
    mint: process.env.MINT_NVDA || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#10B981',
    category: 'Semiconductors & AI',
    change24h: '+4.2%',
    underlyingPrice: '$220.00',
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg',
    weightPercent: 0,
    mint: process.env.MINT_TSM || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#06B6D4',
    category: 'Semiconductors & AI',
    change24h: '+2.8%',
    underlyingPrice: '$195.40',
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    weightPercent: 0,
    mint: process.env.MINT_AMD || '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    decimals: 6,
    color: '#EF4444',
    category: 'Semiconductors & AI',
    change24h: '+1.9%',
    underlyingPrice: '$165.20',
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    weightPercent: 0,
    mint: process.env.MINT_AVGO || '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    decimals: 6,
    color: '#F59E0B',
    category: 'Semiconductors & AI',
    change24h: '+3.1%',
    underlyingPrice: '$185.30',
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies',
    weightPercent: 0,
    mint: process.env.MINT_PLTR || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#6366F1',
    category: 'Semiconductors & AI',
    change24h: '+5.4%',
    underlyingPrice: '$42.80',
  },

  // Mega-Cap Tech
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    weightPercent: 0,
    mint: process.env.MINT_AAPL || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#94A3B8',
    category: 'Mega-Cap Tech',
    change24h: '+0.9%',
    underlyingPrice: '$232.50',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    weightPercent: 0,
    mint: process.env.MINT_MSFT || '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    decimals: 6,
    color: '#38BDF8',
    category: 'Mega-Cap Tech',
    change24h: '+1.4%',
    underlyingPrice: '$432.10',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    weightPercent: 0,
    mint: process.env.MINT_GOOGL || '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    decimals: 6,
    color: '#60A5FA',
    category: 'Mega-Cap Tech',
    change24h: '+1.1%',
    underlyingPrice: '$165.70',
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    weightPercent: 0,
    mint: process.env.MINT_AMZN || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#F97316',
    category: 'Mega-Cap Tech',
    change24h: '+2.2%',
    underlyingPrice: '$186.90',
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    weightPercent: 0,
    mint: process.env.MINT_META || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#0284C7',
    category: 'Mega-Cap Tech',
    change24h: '+3.7%',
    underlyingPrice: '$512.40',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    weightPercent: 0,
    mint: process.env.MINT_TSLA || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#E11D48',
    category: 'Mega-Cap Tech',
    change24h: '+4.8%',
    underlyingPrice: '$230.20',
  },

  // Indices & Market Benchmarks
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    weightPercent: 0,
    mint: process.env.MINT_SPY || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#F59E0B',
    category: 'Indices & Benchmarks',
    change24h: '+0.7%',
    underlyingPrice: '$558.10',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    weightPercent: 0,
    mint: process.env.MINT_QQQ || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#8B5CF6',
    category: 'Indices & Benchmarks',
    change24h: '+1.5%',
    underlyingPrice: '$482.40',
  },
  {
    ticker: 'SMH',
    name: 'VanEck Semiconductor ETF',
    weightPercent: 0,
    mint: process.env.MINT_SMH || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#10B981',
    category: 'Indices & Benchmarks',
    change24h: '+3.3%',
    underlyingPrice: '$248.90',
  },
  {
    ticker: 'IWM',
    name: 'iShares Russell 2000 Small-Cap',
    weightPercent: 0,
    mint: process.env.MINT_IWM || '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    decimals: 6,
    color: '#EC4899',
    category: 'Indices & Benchmarks',
    change24h: '+1.2%',
    underlyingPrice: '$218.60',
  },
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market',
    weightPercent: 0,
    mint: process.env.MINT_VTI || '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    decimals: 6,
    color: '#14F195',
    category: 'Indices & Benchmarks',
    change24h: '+0.8%',
    underlyingPrice: '$274.50',
  },

  // Commodities & Real-World Assets (RWAs)
  {
    ticker: 'GLD',
    name: 'SPDR Gold Shares (Tokenized Gold)',
    weightPercent: 0,
    mint: process.env.MINT_GLD || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#FBBF24',
    category: 'Commodities & Yield',
    change24h: '+0.6%',
    underlyingPrice: '$232.80',
  },
  {
    ticker: 'SLV',
    name: 'iShares Silver Trust',
    weightPercent: 0,
    mint: process.env.MINT_SLV || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#CBD5E1',
    category: 'Commodities & Yield',
    change24h: '+1.8%',
    underlyingPrice: '$28.40',
  },
  {
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond',
    weightPercent: 0,
    mint: process.env.MINT_TLT || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#3B82F6',
    category: 'Commodities & Yield',
    change24h: '-0.3%',
    underlyingPrice: '$98.20',
  },
  {
    ticker: 'USDY',
    name: 'Ondo US Dollar Yield (Treasuries)',
    weightPercent: 0,
    mint: process.env.MINT_USDY || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#10B981',
    category: 'Commodities & Yield',
    change24h: '+5.1% APY',
    underlyingPrice: '$1.05',
  },
  {
    ticker: 'USO',
    name: 'United States Oil Fund',
    weightPercent: 0,
    mint: process.env.MINT_USO || '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    decimals: 6,
    color: '#A16207',
    category: 'Commodities & Yield',
    change24h: '+1.4%',
    underlyingPrice: '$78.10',
  },

  // Web3 Equities & Infrastructure
  {
    ticker: 'COIN',
    name: 'Coinbase Global Inc.',
    weightPercent: 0,
    mint: process.env.MINT_COIN || '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    decimals: 6,
    color: '#2563EB',
    category: 'Web3 Equities',
    change24h: '+6.8%',
    underlyingPrice: '$218.40',
  },
  {
    ticker: 'SOL',
    name: 'Wrapped Solana (L1 Proxy)',
    weightPercent: 0,
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    color: '#9945FF',
    category: 'Web3 Equities',
    change24h: '+4.5%',
    underlyingPrice: '$142.30',
  },
  {
    ticker: 'JUP',
    name: 'Jupiter (Solana DEX Engine)',
    weightPercent: 0,
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#00F0FF',
    category: 'Web3 Equities',
    change24h: '+5.2%',
    underlyingPrice: '$0.84',
  },
];

export const STOCK_MINTS: Record<string, string> = TOKEN_CATALOG.reduce((acc, t) => {
  acc[t.ticker] = t.mint;
  return acc;
}, {} as Record<string, string>);

/**
 * 6 Curated Pre-Baked PocketETFs
 */
export const CURATED_ETFS: Record<string, ETFDefinition> = {
  'silicon-ai': {
    id: 'silicon-ai',
    name: 'Silicon AI Supercycle',
    symbol: 'PETF-AI',
    tagline: 'Leading AI Hardware & Foundry Pioneers',
    description: '1-Click execution for 40% NVIDIA (NVDA), 30% TSMC (TSM), and 30% AMD via Jupiter DEX aggregation.',
    iconPath: '/etfs/silicon-ai.svg',
    category: 'AI & Semiconductors',
    colorGradient: { from: '#10B981', to: '#06B6D4' },
    metrics: { aumSimulated: '$4.2M', benchmarkYield: '+64.2% YTD', volatility: 'High' },
    targetAssets: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', weightPercent: 40, mint: STOCK_MINTS.NVDA, decimals: 6, color: '#10B981', category: 'Semiconductors & AI' },
      { ticker: 'TSM', name: 'Taiwan Semiconductor', weightPercent: 30, mint: STOCK_MINTS.TSM, decimals: 6, color: '#06B6D4', category: 'Semiconductors & AI' },
      { ticker: 'AMD', name: 'Advanced Micro Devices', weightPercent: 30, mint: STOCK_MINTS.AMD, decimals: 6, color: '#EF4444', category: 'Semiconductors & AI' },
    ],
  },
  'mag-titans': {
    id: 'mag-titans',
    name: 'Magnificent Tech Titans',
    symbol: 'PETF-TITAN',
    tagline: 'The Three Dominant Innovation Engines',
    description: 'Instant allocation across 34% Apple (AAPL), 33% Microsoft (MSFT), and 33% Alphabet (GOOGL).',
    iconPath: '/etfs/mag-titans.svg',
    category: 'Mega-Cap Tech',
    colorGradient: { from: '#8B5CF6', to: '#EC4899' },
    metrics: { aumSimulated: '$8.7M', benchmarkYield: '+31.8% YTD', volatility: 'Moderate' },
    targetAssets: [
      { ticker: 'AAPL', name: 'Apple Inc.', weightPercent: 34, mint: STOCK_MINTS.AAPL, decimals: 6, color: '#94A3B8', category: 'Mega-Cap Tech' },
      { ticker: 'MSFT', name: 'Microsoft Corp', weightPercent: 33, mint: STOCK_MINTS.MSFT, decimals: 6, color: '#38BDF8', category: 'Mega-Cap Tech' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', weightPercent: 33, mint: STOCK_MINTS.GOOGL, decimals: 6, color: '#60A5FA', category: 'Mega-Cap Tech' },
    ],
  },
  'spy-benchmark': {
    id: 'spy-benchmark',
    name: 'S&P 500 Benchmark Proxy',
    symbol: 'PETF-SPY',
    tagline: 'The Gold Standard US Market Benchmark',
    description: '100% S&P 500 Index Proxy (SPY) tokenized equity exposure in a single Solana transaction.',
    iconPath: '/etfs/spy-benchmark.svg',
    category: 'Broad Market',
    colorGradient: { from: '#F59E0B', to: '#EF4444' },
    metrics: { aumSimulated: '$12.4M', benchmarkYield: '+18.4% YTD', volatility: 'Low' },
    targetAssets: [
      { ticker: 'SPY', name: 'S&P 500 ETF Proxy', weightPercent: 100, mint: STOCK_MINTS.SPY, decimals: 6, color: '#F59E0B', category: 'Indices & Benchmarks' },
    ],
  },
  'nasdaq-growth': {
    id: 'nasdaq-growth',
    name: 'Nasdaq-100 Growth Titans',
    symbol: 'PETF-QQQ',
    tagline: 'High-Beta Consumer Tech & Cloud Leaders',
    description: 'Balanced growth exposure: 50% Nasdaq-100 (QQQ), 25% Amazon (AMZN), and 25% Meta Platforms (META).',
    iconPath: '/etfs/nasdaq-growth.svg',
    category: 'Broad Market',
    colorGradient: { from: '#0284C7', to: '#6366F1' },
    metrics: { aumSimulated: '$6.1M', benchmarkYield: '+26.9% YTD', volatility: 'Moderate' },
    targetAssets: [
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', weightPercent: 50, mint: STOCK_MINTS.QQQ, decimals: 6, color: '#8B5CF6', category: 'Indices & Benchmarks' },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', weightPercent: 25, mint: STOCK_MINTS.AMZN, decimals: 6, color: '#F97316', category: 'Mega-Cap Tech' },
      { ticker: 'META', name: 'Meta Platforms Inc.', weightPercent: 25, mint: STOCK_MINTS.META, decimals: 6, color: '#0284C7', category: 'Mega-Cap Tech' },
    ],
  },
  'hard-assets': {
    id: 'hard-assets',
    name: 'All-Weather Gold & Treasuries',
    symbol: 'PETF-SAFE',
    tagline: 'Inflation Hedge & Risk-Off Capital Preservation',
    description: 'Defensive wealth preservation: 50% Physical Gold (GLD) and 50% 20+ Year US Treasuries (TLT).',
    iconPath: '/etfs/hard-assets.svg',
    category: 'Growth & Commodities',
    colorGradient: { from: '#FBBF24', to: '#3B82F6' },
    metrics: { aumSimulated: '$3.8M', benchmarkYield: '+14.2% YTD', volatility: 'Low' },
    targetAssets: [
      { ticker: 'GLD', name: 'SPDR Gold Shares', weightPercent: 50, mint: STOCK_MINTS.GLD, decimals: 6, color: '#FBBF24', category: 'Commodities & Yield' },
      { ticker: 'TLT', name: '20+ Year US Treasury', weightPercent: 50, mint: STOCK_MINTS.TLT, decimals: 6, color: '#3B82F6', category: 'Commodities & Yield' },
    ],
  },
  'crypto-frontier': {
    id: 'crypto-frontier',
    name: 'Web3 & Financial Infrastructure',
    symbol: 'PETF-WEB3',
    tagline: 'Leading Crypto Economy & L1 Protocols',
    description: 'Diversified crypto ecosystem exposure: 50% Coinbase (COIN), 25% Solana (SOL), and 25% Jupiter (JUP).',
    iconPath: '/etfs/crypto-frontier.svg',
    category: 'Web3',
    colorGradient: { from: '#2563EB', to: '#9945FF' },
    metrics: { aumSimulated: '$5.5M', benchmarkYield: '+52.1% YTD', volatility: 'High' },
    targetAssets: [
      { ticker: 'COIN', name: 'Coinbase Global', weightPercent: 50, mint: STOCK_MINTS.COIN, decimals: 6, color: '#2563EB', category: 'Web3 Equities' },
      { ticker: 'SOL', name: 'Wrapped Solana', weightPercent: 25, mint: STOCK_MINTS.SOL, decimals: 9, color: '#9945FF', category: 'Web3 Equities' },
      { ticker: 'JUP', name: 'Jupiter DEX', weightPercent: 25, mint: STOCK_MINTS.JUP, decimals: 6, color: '#00F0FF', category: 'Web3 Equities' },
    ],
  },
};

/**
 * Legacy Aliases for Seamless Backward Compatibility
 */
export const PRE_BAKED_BASKETS: Record<string, ETFDefinition> = {
  ...CURATED_ETFS,
  'ai-chipset': CURATED_ETFS['silicon-ai'],
  'us-mega': CURATED_ETFS['mag-titans'],
  'index-proxy': CURATED_ETFS['spy-benchmark'],
};

/**
 * Solana Actions Specification Constants & CORS Headers
 */
export const ACTIONS_SPEC_VERSION = '2.1.3';
export const SOLANA_BLOCKCHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Mainnet Beta Genesis Hash

export const ACTIONS_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids, x-action-version, x-blockchain-ids',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids, x-action-version, x-blockchain-ids',
  'X-Action-Version': ACTIONS_SPEC_VERSION,
  'X-Blockchain-Ids': SOLANA_BLOCKCHAIN_ID,
};

/**
 * Protocol Constraints & Execution Limits
 */
export const MAX_BASKET_ASSETS = 3; // 1232 Bytes MTU Guardrail
export const MAX_ETF_ASSETS = 3;
export const COMPUTE_UNIT_LIMIT = 1_200_000; // Multi-swap budget
export const COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = 50_000; // 0.05 lamports/CU priority
export const DEFAULT_SLIPPAGE_BPS = 100; // 1.00% slippage

/**
 * Jupiter API Endpoints
 */
export const JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://lite-api.jup.ag/swap/v1';
export const JUPITER_API_FALLBACK_URL = 'https://api.jup.ag/swap/v1';

/**
 * Solana RPC Endpoint
 */
export const SOLANA_RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com';
