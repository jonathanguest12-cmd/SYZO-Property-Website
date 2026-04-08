import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/og-image.svg')
await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile('public/og-image.png')

console.log('OG image generated')
