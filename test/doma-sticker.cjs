'use strict'

const { spawn } = require('node:child_process')

const MAX_STICKER_BYTES = 100_000
const STICKER_SIZE = '512:512'
const FIT_STICKER = [
  'format=rgba',
  `scale=${STICKER_SIZE}:force_original_aspect_ratio=decrease`,
  `pad=${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
].join(',')

function encodeWebp(png, quality) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-i', 'pipe:0',
      '-vf', FIT_STICKER, '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(quality),
      '-f', 'webp', 'pipe:1',
    ], { signal: AbortSignal.timeout(10000), stdio: ['pipe', 'pipe', 'ignore'] })

    const chunks = []
    let size = 0
    ffmpeg.stdout.on('data', chunk => {
      size += chunk.length
      if (size <= MAX_STICKER_BYTES) chunks.push(chunk)
    })
    ffmpeg.stdin.on('error', reject)
    ffmpeg.on('error', reject)
    ffmpeg.on('close', code => {
      if (code !== 0 || size === 0) {
        reject(new Error(`Échec de la conversion WebP (FFmpeg ${code}).`))
        return
      }
      resolve(size <= MAX_STICKER_BYTES ? Buffer.concat(chunks) : null)
    })
    ffmpeg.stdin.end(png)
  })
}

async function createStaticSticker(png) {
  for (const quality of [75, 50, 25]) {
    const sticker = await encodeWebp(png, quality)
    if (sticker) return sticker
  }
  throw new Error('Le sticker dépasse 100 Ko après compression.')
}

module.exports = { createStaticSticker }
