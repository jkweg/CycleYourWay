import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFile, rename } from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const sourcePath = path.join(publicDir, 'favicon-source.png')

const originalAsset = path.join(
  'C:',
  'Users',
  'jakub',
  '.cursor',
  'projects',
  'd-CycleYourWay-CycleYourWay-cycle-route-mvp',
  'assets',
  'c__Users_jakub_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_bcfffb5e-919b-4635-86e1-4ceef530e376-34c71fb9-e7cb-4592-a02f-d1f0d2a2a1d4.png',
)

await copyFile(originalAsset, sourcePath)

const meta = await sharp(sourcePath).metadata()
const width = meta.width
const height = meta.height
const radius = Math.round(Math.min(width, height) * 0.09)

const mask = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`,
)

const rounded = await sharp(sourcePath)
  .ensureAlpha()
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer()

const appIconPath = path.join(publicDir, 'app-icon.png')
const faviconPath = path.join(publicDir, 'favicon.png')
const faviconTmpPath = path.join(publicDir, 'favicon.rounded.tmp.png')

await sharp(rounded).resize({ width: 512 }).png().toFile(appIconPath)
await sharp(rounded).resize({ width: 192 }).png().toFile(faviconTmpPath)
await rename(faviconTmpPath, faviconPath)

console.log(`Applied subtle corner radius (${radius}px) to original image only.`)
