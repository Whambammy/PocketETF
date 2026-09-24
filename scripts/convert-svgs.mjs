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
    name: 'Crypto &amp; Infrastructure Frontier',
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
    name: 'Macro Hard Assets &amp; Gold',
    symbol: 'PETF-GOLD',
    holdings: '100% Tokenized Gold Proxy',
    tagline: 'Inflation Hedge &amp; Sound Capital Store',
    color1: '#EAB308',
    color2: '#CA8A04',
    bg: '#171203',
    svgFile: 'hard-assets.svg',
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
        .replace(/width="100%" height="100%"/g, 'width="420" height="420"')
        .replace(/<svg /, '<svg x="70" y="105" ');
    }

    const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad_${cfg.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060A17" />
      <stop offset="50%" stop-color="${cfg.bg}" />
      <stop offset="100%" stop-color="#060A17" />
    </linearGradient>
    <linearGradient id="brandGrad_${cfg.id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cfg.color1}" />
      <stop offset="100%" stop-color="${cfg.color2}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad_${cfg.id})" />

  <!-- Outer Border -->
  <rect x="16" y="16" width="1168" height="598" rx="24" fill="none" stroke="${cfg.color1}" stroke-width="1.5" opacity="0.3" />

  <!-- Top Hairline -->
  <rect x="16" y="16" width="1168" height="4" fill="url(#brandGrad_${cfg.id})" />

  <!-- Embedded Left Badge -->
  ${badgeContent}

  <!-- Right Information Column -->
  <g transform="translate(540, 0)">
    <!-- Header Brand Pill -->
    <rect x="0" y="125" width="230" height="32" rx="16" fill="${cfg.color1}" fill-opacity="0.15" stroke="${cfg.color1}" stroke-width="1" stroke-opacity="0.4" />
    <text x="115" y="146" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="12" fill="${cfg.color1}" text-anchor="middle" letter-spacing="1.5">SOLANA BLINK ACTION</text>

    <!-- Symbol Tag -->
    <text x="250" y="147" font-family="monospace" font-weight="700" font-size="13" fill="#64748b">${cfg.symbol}</text>

    <!-- Main Title -->
    <text x="0" y="215" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="38" fill="#ffffff" letter-spacing="-0.5">${cfg.name}</text>

    <!-- Tagline -->
    <text x="0" y="260" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="19" fill="#94a3b8">${cfg.tagline}</text>

    <!-- Holdings Box -->
    <rect x="0" y="300" width="580" height="76" rx="16" fill="#030712" fill-opacity="0.7" stroke="#ffffff" stroke-width="1" stroke-opacity="0.1" />
    <text x="24" y="332" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="12" fill="#64748b" letter-spacing="1">TARGET ALLOCATION</text>
    <text x="24" y="360" font-family="monospace" font-weight="800" font-size="20" fill="${cfg.color1}">${cfg.holdings}</text>

    <!-- Feature Indicators -->
    <g transform="translate(0, 415)">
      <circle cx="8" cy="8" r="4" fill="#14F195" />
      <text x="22" y="12" font-family="monospace" font-weight="700" font-size="13" fill="#cbd5e1">1-Click Execution via Jupiter DEX</text>

      <circle cx="8" cy="38" r="4" fill="#38BDF8" />
      <text x="22" y="42" font-family="monospace" font-weight="700" font-size="13" fill="#cbd5e1">Pyth Hermes v2 Sub-400ms NAV</text>

      <circle cx="8" cy="68" r="4" fill="#F59E0B" />
      <text x="22" y="72" font-family="monospace" font-weight="700" font-size="13" fill="#cbd5e1">Atomic Versioned Transaction (v0)</text>
    </g>
  </g>

  <!-- Bottom Brand Watermark -->
  <text x="1140" y="580" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="#475569" text-anchor="end" letter-spacing="2">POCKETETF PROTOCOL • SOLANA MAINNET</text>
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
