#!/usr/bin/env node
// Renders the brand mark (ring + route, see src/components/brand/BikeGlyph.jsx) into the
// source images @capacitor/assets expects in ./assets, then run:
//   npx capacitor-assets generate --android --iconBackgroundColor "#2A1A12" --splashBackgroundColor "#2A1A12"
// Re-run both after changing the mark or the colours.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const INK = '#2A1A12'
const ORANGE = '#FC6C26'
const VANILLA = '#FFF4D6'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
mkdirSync(out, { recursive: true })

// Mark drawn in its 28-unit box, centred at (cx, cy) with radius r (ring radius = 13 units).
function mark(cx, cy, r) {
  const s = r / 13
  return `<g transform="translate(${cx - 14 * s} ${cy - 14 * s}) scale(${s})">
    <circle cx="14" cy="14" r="13" fill="none" stroke="${ORANGE}" stroke-width="2"/>
    <path d="M7 17 C 11 9 17 21 21 11" fill="none" stroke="${VANILLA}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="7" cy="17" r="1.6" fill="${ORANGE}"/>
  </g>`
}

const svg = (size, body, background = 'none') =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background === 'none' ? '' : `<rect width="${size}" height="${size}" fill="${background}"/>`}
    ${body}
  </svg>`)

const files = {
  // Legacy/non-adaptive icon: full square, the launcher applies its own mask.
  'icon-only.png': svg(1024, mark(512, 512, 300), INK),
  // Adaptive icon: Capacitor's ic_launcher.xml insets it by a further 16.7%.
  'icon-foreground.png': svg(1024, mark(512, 512, 300)),
  'icon-background.png': svg(1024, '', INK),
  'splash.png': svg(2732, mark(1366, 1366, 260), INK),
  'splash-dark.png': svg(2732, mark(1366, 1366, 260), INK),
}

for (const [name, data] of Object.entries(files)) {
  await sharp(data).png().toFile(join(out, name))
  console.log('wrote assets/' + name)
}
