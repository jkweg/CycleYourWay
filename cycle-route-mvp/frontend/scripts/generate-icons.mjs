/**
 * Brand PNG icons for PWA / Capacitor from a simple canvas-free pipeline (sharp).
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')

const svgFor = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#4a3226"/>
  <path d="M128 352c40 0 40-160 96-160s56 128 96 128 64-96 64-96" stroke="#FC6C26" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"/>
  <circle cx="150" cy="330" r="58" stroke="#FFF4D6" stroke-width="22" fill="none"/>
  <circle cx="362" cy="330" r="58" stroke="#FFF4D6" stroke-width="22" fill="none"/>
  <path d="M150 330 L232 330 L300 224 L210 224" stroke="#FFF4D6" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M300 224 L362 330" stroke="#FFF4D6" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M286 188 a26 26 0 1 0 0.1 0 Z" fill="#FC6C26"/>
  <path d="M286 150 c-26 0 -46 20 -46 45 c0 32 46 73 46 73 s46 -41 46 -73 c0 -25 -20 -45 -46 -45 Z" fill="#E08A50"/>
  <circle cx="286" cy="194" r="16" fill="#4a3226"/>
</svg>`

async function writePng(name, size) {
  const buf = await sharp(Buffer.from(svgFor(size))).png().toBuffer()
  writeFileSync(join(publicDir, name), buf)
  console.log('wrote', name, size)
}

await writePng('app-icon.png', 512)
await writePng('favicon.png', 192)
await writePng('apple-touch-icon.png', 180)
console.log('done')
