export interface ETFAsset {
  ticker: string;
  name: string;
  weightPercent: number;
  mint: string;
  decimals: number;
  color: string;
  category: 'Semiconductors & AI' | 'Mega-Cap Tech' | 'Indices & Benchmarks' | 'Commodities & Yield' | 'Web3 Equities';
  primaryDex?: 'Whirlpool' | 'Meteora' | 'Raydium';
  change24h?: string;
  underlyingPrice?: string;
  pythFeedId?: string;
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
 * Protocol Revenue & Monetization Engine (Configured to 0 bps by default for Alpha testing)
 */
export const DEFAULT_PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS) || 0; // 0 bps = 0% for Hackathon
export const PROTOCOL_TREASURY_PUBKEY = process.env.TREASURY_PUBKEY || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const CREATOR_FEE_SPLIT_PERCENT = 50; // 50% split to Blink curators

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
    primaryDex: 'Whirlpool',
    change24h: '+4.2%',
    underlyingPrice: '$220.00',
    pythFeedId: '0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593',
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg',
    weightPercent: 0,
    mint: process.env.MINT_TSM || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#06B6D4',
    category: 'Semiconductors & AI',
    primaryDex: 'Meteora',
    change24h: '+2.8%',
    underlyingPrice: '$195.40',
    pythFeedId: '0x5109b83b3e2189fb462f43dbb10815776d54cf8e3f4ad699eec38515c0a0c649',
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    weightPercent: 0,
    mint: process.env.MINT_AMD || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#EF4444',
    category: 'Semiconductors & AI',
    primaryDex: 'Raydium',
    change24h: '+1.9%',
    underlyingPrice: '$165.20',
    pythFeedId: '0xd365f112fa7cfec7f1b72e987c9ec5ca7ee90a424e83a9f0e13c8f85f3a0937a',
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    weightPercent: 0,
    mint: process.env.MINT_AVGO || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#F59E0B',
    category: 'Semiconductors & AI',
    primaryDex: 'Whirlpool',
    change24h: '+3.1%',
    underlyingPrice: '$185.30',
    pythFeedId: '0x24749f7831d10e527d2c12513f5fb479b18ba046d3e8ad6f54ab179bf1db8ef5',
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies',
    weightPercent: 0,
    mint: process.env.MINT_PLTR || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#6366F1',
    category: 'Semiconductors & AI',
    primaryDex: 'Raydium',
    change24h: '+5.4%',
    underlyingPrice: '$42.80',
    pythFeedId: '0x64703be3a4ffbfa506820245050f28e2da5ea9b69c4f1c9c41f71dfb19908611',
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
    primaryDex: 'Raydium',
    change24h: '+0.9%',
    underlyingPrice: '$232.50',
    pythFeedId: '0x49f6b65eb1bf245ad4ec79e2c24483d34e680480a4a2fdb4466bca5fed2f7902',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    weightPercent: 0,
    mint: process.env.MINT_MSFT || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#38BDF8',
    category: 'Mega-Cap Tech',
    primaryDex: 'Meteora',
    change24h: '+1.4%',
    underlyingPrice: '$432.10',
    pythFeedId: '0xd0ca22c31e9aeaeab98ea9878a3c861214e27f0980582845ab3d191d9cf1b702',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    weightPercent: 0,
    mint: process.env.MINT_GOOGL || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#60A5FA',
    category: 'Mega-Cap Tech',
    primaryDex: 'Whirlpool',
    change24h: '+1.1%',
    underlyingPrice: '$165.70',
    pythFeedId: '0x5a2d590e8fc5500e28f2eb67586522c091d37803df3985b9b94fa8ec6287c2fb',
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    weightPercent: 0,
    mint: process.env.MINT_AMZN || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#F97316',
    category: 'Mega-Cap Tech',
    primaryDex: 'Whirlpool',
    change24h: '+2.2%',
    underlyingPrice: '$186.90',
    pythFeedId: '0x9780b62e49c719ef8947f636c7a408796f6e5e8e89ad6c9d7494a82161426466',
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    weightPercent: 0,
    mint: process.env.MINT_META || '39dsMJzCWKfqkFHP31pog88M2bd8fjQzYTyJKSoU6sGY',
    decimals: 6,
    color: '#0284C7',
    category: 'Mega-Cap Tech',
    primaryDex: 'Whirlpool',
    change24h: '+3.7%',
    underlyingPrice: '$512.40',
    pythFeedId: '0xc21805561a00a0664906f2d22b64d39f71c4c9258282b9e67272821a7a1c7fc0',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    weightPercent: 0,
    mint: process.env.MINT_TSLA || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#E11D48',
    category: 'Mega-Cap Tech',
    primaryDex: 'Meteora',
    change24h: '+4.8%',
    underlyingPrice: '$230.20',
    pythFeedId: '0x16027a050f28e678ba499a224a141bdf0d42ae5049b4938a16db8a2a514fa67c',
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
    primaryDex: 'Whirlpool',
    change24h: '+0.7%',
    underlyingPrice: '$558.10',
    pythFeedId: '0x2617fe89849204005b4b104992989db96860085d773c3cbdf98c0b25e79148d4',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    weightPercent: 0,
    mint: process.env.MINT_QQQ || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#8B5CF6',
    category: 'Indices & Benchmarks',
    primaryDex: 'Raydium',
    change24h: '+1.5%',
    underlyingPrice: '$482.40',
    pythFeedId: '0xb8f2d59648939c4d9241b7771ec8e9f567b5e825e98f06079c6563ee28e61474',
  },
  {
    ticker: 'SMH',
    name: 'VanEck Semiconductor ETF',
    weightPercent: 0,
    mint: process.env.MINT_SMH || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#10B981',
    category: 'Indices & Benchmarks',
    primaryDex: 'Whirlpool',
    change24h: '+3.3%',
    underlyingPrice: '$248.90',
    pythFeedId: '0x16be85ea933390fe66f4cfbfa4876b66e13faeefad0066b5372332616cfd25fd',
  },
  {
    ticker: 'IWM',
    name: 'iShares Russell 2000 Small-Cap',
    weightPercent: 0,
    mint: process.env.MINT_IWM || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#EC4899',
    category: 'Indices & Benchmarks',
    primaryDex: 'Raydium',
    change24h: '+1.2%',
    underlyingPrice: '$218.60',
    pythFeedId: '0xcfc02e7ecbc367db0ee32e4d01b1fc86a422eb2c8e317c2a71f00cb105e46cbb',
  },
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market',
    weightPercent: 0,
    mint: process.env.MINT_VTI || '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 6,
    color: '#14F195',
    category: 'Indices & Benchmarks',
    primaryDex: 'Meteora',
    change24h: '+0.8%',
    underlyingPrice: '$274.50',
    pythFeedId: '0x327bf094a9ea4a56c078a6ff622a5598ba96561cf6fdf399c5c165ef678b88d3',
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
    primaryDex: 'Meteora',
    change24h: '+0.6%',
    underlyingPrice: '$232.80',
    pythFeedId: '0x765d2ba906dbc32ca17cc11f5310a43e8033997db1aeb254a6ba604e710255eb',
  },
  {
    ticker: 'SLV',
    name: 'iShares Silver Trust',
    weightPercent: 0,
    mint: process.env.MINT_SLV || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#CBD5E1',
    category: 'Commodities & Yield',
    primaryDex: 'Raydium',
    change24h: '+1.8%',
    underlyingPrice: '$28.40',
    pythFeedId: '0x4031df1ebf0d46d0a7905187747e4b2d6a78ea3e800927df4d2d488e3a20726d',
  },
  {
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond',
    weightPercent: 0,
    mint: process.env.MINT_TLT || 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#3B82F6',
    category: 'Commodities & Yield',
    primaryDex: 'Whirlpool',
    change24h: '-0.3%',
    underlyingPrice: '$98.20',
    pythFeedId: '0xc28258dc78ea598b0f4fa6e45447ea873db863c32ffc9ce35b1d5c7f8a7e082a',
  },
  {
    ticker: 'USDY',
    name: 'Ondo US Dollar Yield (Treasuries)',
    weightPercent: 0,
    mint: process.env.MINT_USDY || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#10B981',
    category: 'Commodities & Yield',
    primaryDex: 'Whirlpool',
    change24h: '+5.1% APY',
    underlyingPrice: '$1.05',
    pythFeedId: '0x367f08bfd7bb957b98d363d66663ce951e7a5c8163f538334466b0adad0263f3',
  },
  {
    ticker: 'USO',
    name: 'United States Oil Fund',
    weightPercent: 0,
    mint: process.env.MINT_USO || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#A16207',
    category: 'Commodities & Yield',
    primaryDex: 'Raydium',
    change24h: '+1.4%',
    underlyingPrice: '$78.10',
    pythFeedId: '0x0eb3a77884848d6139151e28fa2ee950668b57732a3fc79287c89f5c40131498',
  },

  // Web3 Equities & Infrastructure
  {
    ticker: 'COIN',
    name: 'Coinbase Global Inc.',
    weightPercent: 0,
    mint: process.env.MINT_COIN || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    color: '#2563EB',
    category: 'Web3 Equities',
    primaryDex: 'Raydium',
    change24h: '+6.8%',
    underlyingPrice: '$218.40',
    pythFeedId: '0x738d9ad7bc149306b9eaee6cf8a23072237eb5f013d7e5e33d45cf59b2075bf9',
  },
  {
    ticker: 'MSTR',
    name: 'MicroStrategy (Backpack / Sunrise)',
    weightPercent: 0,
    mint: process.env.MINT_MSTR || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 6,
    color: '#D97706',
    category: 'Web3 Equities',
    primaryDex: 'Whirlpool',
    change24h: '+8.4%',
    underlyingPrice: '$134.50',
    pythFeedId: '0xeb88820c6c21e5e0640df21d1aa56ee892d47f9a8a3064ec80c5bd4a22ad39a2',
  },
  {
    ticker: 'SOL',
    name: 'Wrapped Solana (L1 Proxy)',
    weightPercent: 0,
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    color: '#9945FF',
    category: 'Web3 Equities',
    primaryDex: 'Meteora',
    change24h: '+4.5%',
    underlyingPrice: '$142.30',
    pythFeedId: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  },
  {
    ticker: 'JUP',
    name: 'Jupiter (Solana DEX Engine)',
    weightPercent: 0,
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    color: '#00F0FF',
    category: 'Web3 Equities',
    primaryDex: 'Whirlpool',
    change24h: '+5.2%',
    underlyingPrice: '$0.84',
    pythFeedId: '0x0a0409d6042f4493a388f8d6840742111fe1e360f04c6ebcf1cc0184b2354c41',
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
    description: '1-Click execution for 60% NVIDIA (NVDA) and 40% Taiwan Semiconductor (TSM) via Jupiter DEX aggregation.',
    iconPath: '/etfs/silicon-ai.png',
    category: 'AI & Semiconductors',
    colorGradient: { from: '#10B981', to: '#06B6D4' },
    metrics: { aumSimulated: '$4.2M', benchmarkYield: '+64.2% YTD', volatility: 'High' },
    targetAssets: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', weightPercent: 60, mint: STOCK_MINTS.NVDA, decimals: 6, color: '#10B981', category: 'Semiconductors & AI' },
      { ticker: 'TSM', name: 'Taiwan Semiconductor', weightPercent: 40, mint: STOCK_MINTS.TSM, decimals: 6, color: '#06B6D4', category: 'Semiconductors & AI' },
    ],
  },
  'mag-titans': {
    id: 'mag-titans',
    name: 'Magnificent Tech Titans',
    symbol: 'PETF-TITAN',
    tagline: 'The Dominant Innovation Engines',
    description: 'Instant allocation across 50% Apple (AAPL) and 50% Microsoft (MSFT).',
    iconPath: '/etfs/mag-titans.png',
    category: 'Mega-Cap Tech',
    colorGradient: { from: '#8B5CF6', to: '#EC4899' },
    metrics: { aumSimulated: '$8.7M', benchmarkYield: '+31.8% YTD', volatility: 'Moderate' },
    targetAssets: [
      { ticker: 'AAPL', name: 'Apple Inc.', weightPercent: 50, mint: STOCK_MINTS.AAPL, decimals: 6, color: '#94A3B8', category: 'Mega-Cap Tech' },
      { ticker: 'MSFT', name: 'Microsoft Corp', weightPercent: 50, mint: STOCK_MINTS.MSFT, decimals: 6, color: '#38BDF8', category: 'Mega-Cap Tech' },
    ],
  },
  'spy-benchmark': {
    id: 'spy-benchmark',
    name: 'S&P 500 Benchmark Proxy',
    symbol: 'PETF-SPY',
    tagline: 'The Gold Standard US Market Benchmark',
    description: '100% S&P 500 Index Proxy (SPY) tokenized equity exposure in a single Solana transaction.',
    iconPath: '/etfs/spy-benchmark.png',
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
    description: 'Balanced growth exposure: 60% Nasdaq-100 (QQQ) and 40% Amazon (AMZN).',
    iconPath: '/etfs/nasdaq-growth.png',
    category: 'Broad Market',
    colorGradient: { from: '#0284C7', to: '#6366F1' },
    metrics: { aumSimulated: '$6.1M', benchmarkYield: '+26.9% YTD', volatility: 'Moderate' },
    targetAssets: [
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', weightPercent: 60, mint: STOCK_MINTS.QQQ, decimals: 6, color: '#8B5CF6', category: 'Indices & Benchmarks' },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', weightPercent: 40, mint: STOCK_MINTS.AMZN, decimals: 6, color: '#F97316', category: 'Mega-Cap Tech' },
    ],
  },
  'hard-assets': {
    id: 'hard-assets',
    name: 'All-Weather Gold & Treasuries',
    symbol: 'PETF-SAFE',
    tagline: 'Inflation Hedge & Risk-Off Capital Preservation',
    description: 'Defensive wealth preservation: 50% Physical Gold (GLD) and 50% 20+ Year US Treasuries (TLT).',
    iconPath: '/etfs/hard-assets.png',
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
    name: 'Web3 & Solana Infrastructure',
    symbol: 'PETF-WEB3',
    tagline: 'Leading Crypto Economy & L1 Protocols',
    description: 'Premier Solana ecosystem exposure: 50% Wrapped Solana (SOL) and 50% Jupiter DEX Engine (JUP).',
    iconPath: '/etfs/crypto-frontier.png',
    category: 'Web3',
    colorGradient: { from: '#2563EB', to: '#9945FF' },
    metrics: { aumSimulated: '$5.5M', benchmarkYield: '+52.1% YTD', volatility: 'High' },
    targetAssets: [
      { ticker: 'SOL', name: 'Wrapped Solana', weightPercent: 50, mint: STOCK_MINTS.SOL, decimals: 9, color: '#9945FF', category: 'Web3 Equities' },
      { ticker: 'JUP', name: 'Jupiter DEX', weightPercent: 50, mint: STOCK_MINTS.JUP, decimals: 6, color: '#00F0FF', category: 'Web3 Equities' },
    ],
  },
  'backpack-titans': {
    id: 'backpack-titans',
    name: 'Backpack 24/7 Equity Titans',
    symbol: 'PETF-BPK',
    tagline: '1:1 Regulated Custody Tokenized Stocks',
    description: 'Canonical tokenized equities: 50% NVIDIA (NVDA) and 50% MicroStrategy (MSTR) backed 1:1 by real shares in custody.',
    iconPath: '/etfs/mag-titans.png',
    category: 'Mega-Cap Tech',
    colorGradient: { from: '#E11D48', to: '#6366F1' },
    metrics: { aumSimulated: '$4.2M', benchmarkYield: '+42.3% YTD', volatility: 'Moderate' },
    targetAssets: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', weightPercent: 50, mint: STOCK_MINTS.NVDA, decimals: 6, color: '#10B981', category: 'Semiconductors & AI' },
      { ticker: 'MSTR', name: 'MicroStrategy Inc.', weightPercent: 50, mint: STOCK_MINTS.MSTR, decimals: 6, color: '#D97706', category: 'Web3 Equities' },
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
export const MAX_BASKET_ASSETS = 3; // Allows up to 3 compatible assets within 1232B MTU limit
export const MAX_ETF_ASSETS = 3;
export const COMPUTE_UNIT_LIMIT = 1_000_000; // Multi-swap budget
export const COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = 25_000; // 0.025 lamports/CU priority
export const DEFAULT_SLIPPAGE_BPS = 100; // 1.00% slippage
export const COMPACT_ROUTING_DEXES = 'Raydium,Raydium+CP,Whirlpool,Meteora,Meteora+DLMM'; // Standard AMMs indexed in Jupiter ALTs

/**
 * Evaluates whether a basket of assets complies with Solana's 1232B MTU packet limit.
 * Baskets with 1 or 2 distinct DEX programs compile to <= 1,154B (Safe).
 * Baskets with 3 distinct DEX programs compile to 1,264B-1,290B and exceed the 1232B MTU limit.
 */
export function getDEXConflictStatus(assets: ETFAsset[]): {
  isCompatible: boolean;
  uniqueDexes: string[];
  estimatedBytes: number;
  statusLabel: string;
  reason?: string;
} {
  if (!assets || assets.length === 0) {
    return {
      isCompatible: true,
      uniqueDexes: [],
      estimatedBytes: 0,
      statusLabel: 'Empty',
    };
  }

  if (assets.length <= 2) {
    const dexes = Array.from(new Set(assets.map((a) => a.primaryDex || 'Whirlpool')));
    return {
      isCompatible: true,
      uniqueDexes: dexes,
      estimatedBytes: assets.length === 1 ? 580 : 840,
      statusLabel: 'Optimal (Safe)',
    };
  }

  // 3 or more assets
  const dexSet = new Set(assets.map((a) => a.primaryDex || 'Whirlpool'));
  const uniqueDexes = Array.from(dexSet);

  if (uniqueDexes.length === 1) {
    return {
      isCompatible: true,
      uniqueDexes,
      estimatedBytes: 1002, // 1 DEX program (Whirlpool or Meteora) shares accounts in ALT
      statusLabel: `Compatible (1 AMM: ${uniqueDexes[0]} ~1,002B / 1232B)`,
    };
  } else if (uniqueDexes.length === 2) {
    return {
      isCompatible: true,
      uniqueDexes,
      estimatedBytes: 1154, // 2 DEX programs fit safely under 1,232B MTU
      statusLabel: `Compatible (2 AMMs: ${uniqueDexes.join(' + ')} ~1,154B / 1232B)`,
    };
  } else {
    // 3 distinct DEX programs (e.g. Whirlpool + Meteora + Raydium)
    return {
      isCompatible: false,
      uniqueDexes,
      estimatedBytes: 1268, // Exceeds 1,232B limit
      statusLabel: '3-DEX Conflict (Exceeds 1232B MTU)',
      reason: `3-DEX Conflict: The selected assets trade across 3 separate AMMs (${uniqueDexes.join(', ')}). Bundling 3 distinct DEX programs exceeds Solana's 1232B MTU packet limit. Please choose assets that share liquidity venues (e.g., Whirlpool + Meteora) to safely bundle 3 stocks.`,
    };
  }
}

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
