// gen-icons.mjs
// Run once: node gen-icons.mjs
// Requires: npm install canvas
// Generates placeholder icons. Replace with real art before shipping.

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SIZES = [16, 32, 180, 192, 512];
const OUT   = join(process.cwd(), 'public', 'icons');
mkdirSync(OUT, { recursive: true });

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#020402';
  ctx.fillRect(0, 0, size, size);

  // Outer glow border
  ctx.strokeStyle = '#39ff14';
  ctx.lineWidth   = Math.max(1, size * 0.025);
  ctx.strokeRect(
    ctx.lineWidth,
    ctx.lineWidth,
    size - ctx.lineWidth * 2,
    size - ctx.lineWidth * 2
  );

  // Skull glyph (☠) centred
  const fontSize = Math.floor(size * 0.5);
  ctx.fillStyle  = '#39ff14';
  ctx.font       = `${fontSize}px serif`;
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☠', size / 2, size / 2);

  // "VC" label at bottom for larger icons
  if (size >= 180) {
    const labelSize = Math.floor(size * 0.12);
    ctx.font        = `${labelSize}px monospace`;
    ctx.fillStyle   = '#1a4a1a';
    ctx.fillText('VOID CRAWL', size / 2, size * 0.88);
  }

  const buf  = canvas.toBuffer('image/png');
  const file = join(OUT, `icon-${size}.png`);
  writeFileSync(file, buf);
  console.log(`✓ ${file}`);
}

console.log('\nIcons generated. Replace with production art before shipping.');
