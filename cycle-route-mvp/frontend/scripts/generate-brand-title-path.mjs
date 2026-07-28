import * as fontkit from 'fontkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontUrl =
  'https://fonts.gstatic.com/s/greatvibes/v21/RWmMoKWR9v4ksMfaWd_JN-XC.ttf'

const response = await fetch(fontUrl)
const buffer = Buffer.from(await response.arrayBuffer())
const font = fontkit.create(buffer)
const run = font.layout('Cycle Your Way')

const fontSize = 100
const scale = fontSize / font.unitsPerEm
const baseline = fontSize * 0.82

const glyphs = []
let cursorX = 0
let minX = Infinity
let minY = Infinity
let maxX = -Infinity
let maxY = -Infinity

for (let i = 0; i < run.glyphs.length; i += 1) {
  const glyph = run.glyphs[i]
  const position = run.positions[i]
  const x = cursorX + (position?.xOffset ?? 0) * scale
  const y = (position?.yOffset ?? 0) * scale
  const char = glyph.codePoints
    .map((codePoint) => String.fromCodePoint(codePoint))
    .join('')

  if (char.trim() && glyph.path) {
    const glyphPath = glyph.path.transform(
      scale,
      0,
      0,
      -scale,
      x,
      baseline + y,
    )
    const bbox = glyphPath.bbox
    const d = glyphPath.toSVG().replace(/^<path d="|"\/>$/g, '')

    if (d) {
      minX = Math.min(minX, bbox.minX)
      minY = Math.min(minY, bbox.minY)
      maxX = Math.max(maxX, bbox.maxX)
      maxY = Math.max(maxY, bbox.maxY)

      glyphs.push({ char, d, x })
    }
  }

  cursorX += (position?.xAdvance ?? glyph.advanceWidth) * scale
}

const width = Math.ceil(maxX - minX)
const height = Math.ceil(maxY - minY)

const output = {
  width,
  height,
  viewBox: `0 0 ${width} ${height}`,
  glyphs: glyphs.map((glyph) => ({
    char: glyph.char,
    d: glyph.d,
    transform: `translate(${-minX} ${-minY})`,
  })),
}

const outPath = path.join(__dirname, '../src/assets/brandTitlePath.json')
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(
  `Wrote ${outPath} (${glyphs.length} glyphs, ${width}x${height}, x: ${glyphs.map((g) => g.x.toFixed(1)).join(', ')})`,
)
