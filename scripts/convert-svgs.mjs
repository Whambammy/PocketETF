import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const ETFS_DIR = path.resolve('./public/etfs');
const BASKETS_DIR = path.resolve('./public/baskets');

// 1. Convert all square SVGs in public/etfs and public/baskets to 800x800 PNGs
function convertDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  for (const file of files) {
    const svgPath = path.join(dir, file);
    const pngPath = path.join(dir, file.replace(/\.svg$/, '.png'));
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    try {
      const resvg = new Resvg(svgContent, {
        fitTo: { mode: 'width', value: 800 },
        font: {
          loadSystemFonts: true,
          defaultFontFamily: 'sans-serif',
        },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      fs.writeFileSync(pngPath, pngBuffer);
      console.log(`✓ Rendered: ${path.relative(process.cwd(), pngPath)} (${pngBuffer.length} bytes)`);
    } catch (err) {
      console.error(`✗ Error rendering ${file}:`, err);
    }
  }
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const ETF_CONFIGS = [
  {
    id: 'silicon-ai',
    name: 'Silicon AI Supercycle',
    symbol: 'PETF-AI',
    holdings: '60% NVDA • 40% TSM',
    tagline: 'Leading AI Hardware &amp; Foundry Pioneers',
    color1: '#10B981',
    color2: '#06B6D4',
    bg: '#051410',
    svgFile: 'silicon-ai.svg',
  },
  {
    id: 'mag-titans',
    name: 'Magnificent Tech Titans',
    symbol: 'PETF-TITAN',
    holdings: '50% AAPL • 50% MSFT',
    tagline: 'The Dominant Global Innovation Engines',
    color1: '#8B5CF6',
    color2: '#EC4899',
    bg: '#140a22',
    svgFile: 'mag-titans.svg',
  },
  {
    id: 'spy-benchmark',
    name: 'S&amp;P 500 Benchmark Proxy',
    symbol: 'PETF-SPY',
    holdings: '100% S&amp;P 500 Proxy (SPY)',
    tagline: 'The Gold Standard US Market Benchmark',
    color1: '#F59E0B',
    color2: '#EF4444',
    bg: '#1a0f05',
    svgFile: 'spy-benchmark.svg',
  },
  {
    id: 'nasdaq-growth',
    name: 'Nasdaq-100 Growth Titans',
    symbol: 'PETF-QQQ',
    holdings: '60% QQQ • 40% AMZN',
    tagline: 'High-Beta Consumer Tech &amp; Cloud Leaders',
    color1: '#0284C7',
    color2: '#6366F1',
    bg: '#05101f',
    svgFile: 'nasdaq-growth.svg',
  },
  {
    id: 'crypto-frontier',
    name: 'Solana &amp; DEX Infrastructure',
    symbol: 'PETF-FRONTIER',
    holdings: '50% SOL • 50% JUP',
    tagline: 'High-Throughput L1 &amp; DEX Liquidity Engines',
    color1: '#9945FF',
    color2: '#14F195',
    bg: '#11051f',
    svgFile: 'crypto-frontier.svg',
  },
  {
    id: 'hard-assets',
    name: 'Gold &amp; US Treasuries',
    symbol: 'PETF-GOLD',
    holdings: '50% GLD • 50% TLT',
    tagline: 'Inflation Hedge &amp; Risk-Off Wealth Preservation',
    color1: '#EAB308',
    color2: '#CA8A04',
    bg: '#171203',
    svgFile: 'hard-assets.svg',
  },
  {
    id: 'backpack-titans',
    name: 'Backpack Equity Titans',
    symbol: 'PETF-BPK',
    holdings: '50% NVDA • 50% MSTR',
    tagline: '1:1 Regulated Custody Tokenized Stocks',
    color1: '#E11D48',
    color2: '#6366F1',
    bg: '#1a0614',
    svgFile: 'mag-titans.svg',
  },
  {
    id: 'custom',
    name: 'Custom PocketETF Basket',
    symbol: 'PETF-CUSTOM',
    holdings: 'Dynamic Multi-Asset Index',
    tagline: 'User-Minted Thematic Equity Basket',
    color1: '#10B981',
    color2: '#146EF5',
    bg: '#0A1128',
    svgFile: 'custom.svg',
  },
];

function generateWideBanners() {
  for (const cfg of ETF_CONFIGS) {
    const svgBadgePath = path.join(ETFS_DIR, cfg.svgFile);
    let badgeContent = '';
    if (fs.existsSync(svgBadgePath)) {
      badgeContent = fs.readFileSync(svgBadgePath, 'utf8')
        .replace(/<\?xml.*?\?>/g, '')
        .replace(/width="100%" height="100%"/g, 'width="390" height="390"')
        .replace(/<svg /, '<svg x="55" y="115" ');
    }

    const titleFontSize = cfg.name.length > 24 ? '44' : '50';

    const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad_${cfg.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050814" />
      <stop offset="50%" stop-color="${cfg.bg}" />
      <stop offset="100%" stop-color="#02040a" />
    </linearGradient>
    <linearGradient id="brandGrad_${cfg.id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cfg.color1}" />
      <stop offset="100%" stop-color="${cfg.color2}" />
    </linearGradient>
    <filter id="glowOrb_${cfg.id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="60" result="blur" />
    </filter>
  </defs>

  <!-- Deep Background -->
  <rect width="1200" height="630" fill="url(#bgGrad_${cfg.id})" />

  <!-- Ambient Glowing Orb behind badge -->
  <circle cx="250" cy="310" r="220" fill="${cfg.color1}" opacity="0.14" filter="url(#glowOrb_${cfg.id})" />

  <!-- Outer Border Frame -->
  <rect x="14" y="14" width="1172" height="602" rx="26" fill="none" stroke="${cfg.color1}" stroke-width="2" opacity="0.35" />

  <!-- Top Hairline Accent -->
  <rect x="14" y="14" width="1172" height="6" rx="3" fill="url(#brandGrad_${cfg.id})" />

  <!-- Embedded Left Badge -->
  ${badgeContent}

  <!-- Right Information Column -->
  <g transform="translate(485, 0)">
    <!-- Header Pill Row -->
    <rect x="0" y="68" width="240" height="40" rx="20" fill="${cfg.color1}" fill-opacity="0.18" stroke="${cfg.color1}" stroke-width="1.5" stroke-opacity="0.5" />
    <text x="120" y="93" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" fill="${cfg.color1}" text-anchor="middle" letter-spacing="1.5">SOLANA BLINK ACTION</text>

    <!-- Symbol Pill -->
    <rect x="252" y="68" width="150" height="40" rx="20" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
    <text x="327" y="93" font-family="monospace" font-weight="800" font-size="16" fill="#F8FAFC" text-anchor="middle">${cfg.symbol}</text>

    <!-- Main Title (Giant & Bold) -->
    <text x="0" y="172" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${titleFontSize}" fill="#ffffff" letter-spacing="-1">${cfg.name}</text>

    <!-- Tagline (Subhead) -->
    <text x="0" y="215" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="22" fill="#94A3B8">${cfg.tagline}</text>

    <!-- Target Allocation Box (Hero Element with Giant Font) -->
    <rect x="0" y="250" width="650" height="142" rx="20" fill="#020617" fill-opacity="0.9" stroke="${cfg.color1}" stroke-width="2" stroke-opacity="0.4" />
    <text x="28" y="292" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="#64748B" letter-spacing="2">TARGET ALLOCATION</text>
    <text x="28" y="356" font-family="monospace" font-weight="900" font-size="44" fill="${cfg.color1}">${cfg.holdings}</text>

    <!-- Execution Badges -->
    <g transform="translate(0, 420)">
      <rect x="0" y="0" width="295" height="46" rx="14" fill="#00D69F" fill-opacity="0.12" stroke="#00D69F" stroke-width="1.5" stroke-opacity="0.4" />
      <text x="20" y="29" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#00D69F">⚡ 1-Click Jupiter DEX</text>

      <rect x="310" y="0" width="340" height="46" rx="14" fill="#38BDF8" fill-opacity="0.12" stroke="#38BDF8" stroke-width="1.5" stroke-opacity="0.4" />
      <text x="330" y="29" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#38BDF8">🔮 Pyth Hermes v2 Sub-400ms</text>
    </g>
  </g>

  <!-- Bottom Brand Watermark -->
  <text x="1140" y="582" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18" fill="#64748B" text-anchor="end" letter-spacing="2">POCKETETF PROTOCOL • SOLANA MAINNET</text>
</svg>`;


    const bannerPngPath = path.join(ETFS_DIR, `${cfg.id}-banner.png`);
    try {
      const resvg = new Resvg(bannerSvg, {
        fitTo: { mode: 'width', value: 1200 },
        font: {
          loadSystemFonts: true,
          defaultFontFamily: 'sans-serif',
        },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      fs.writeFileSync(bannerPngPath, pngBuffer);
      console.log(`✓ Rendered Banner (1200x630): ${path.relative(process.cwd(), bannerPngPath)} (${pngBuffer.length} bytes)`);
    } catch (err) {
      console.error(`✗ Error rendering banner for ${cfg.id}:`, err);
    }
  }
}

console.log('Rasterizing square ETF SVGs to PNGs...');
convertDir(ETFS_DIR);
convertDir(BASKETS_DIR);

console.log('\nGenerating 1200x630 OpenGraph & Twitter Large Image Banners...');
generateWideBanners();

console.log('\nAll SVG assets successfully rasterized to high-resolution PNGs!');
