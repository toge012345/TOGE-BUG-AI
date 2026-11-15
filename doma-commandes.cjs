'use strict'

const CHANNEL = 'https://whatsapp.com/channel/0029Vb6aMu46RGJOcGGe1H1O'
const MEMEGEN = 'https://api.memegen.link/images/custom'
const UGUU = 'https://uguu.se/upload.php'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MEMEGEN_ESCAPES = {
  ' ': '_', '_': '__', '-': '--', '\n': '~n', '?': '~q', '&': '~a',
  '%': '~p', '#': '~h', '/': '~s', '\\': '~b', '<': '~l', '>': '~g', '"': "''",
}

class MemeInputError extends Error {}

function menu() {
  return {
    text: [
      '*DOMA BUG*',
      'Par Son Altesse',
      '',
      '.menu — Afficher ce menu',
      '.smeme Haut|Bas — Créer un sticker à partir d’une image jointe ou citée',
      '',
      'Chaîne Xelira Studio™',
      CHANNEL,
      '',
      '.smeme envoie ton image à Uguu pour créer un lien temporaire, puis à Memegen avec le texte.',
    ].join('\n'),
  }
}

function encodeCaption(caption) {
  if (!caption) return '_'
  const escaped = caption.replace(/[ _\-\n?&%#/\\<>"]/g, character => MEMEGEN_ESCAPES[character])
  // A segment consisting of dots can otherwise be normalized by URL parsers.
  return /^\.{1,2}$/.test(escaped) ? `${escaped}_` : encodeURIComponent(escaped)
}

async function uploadBackground(image, mime, request) {
  const form = new FormData()
  form.append('files[]', new Blob([image], { type: mime }), `background.${MIME_EXTENSIONS.get(mime)}`)
  const response = await request(UGUU, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  if (!response.ok) throw new Error(`Uguu HTTP ${response.status}`)
  const data = await response.json()
  if (data.success !== true || !data.files?.[0]?.url) throw new Error('Uguu n’a renvoyé aucun lien')
  const background = new URL(data.files[0].url)
  if (background.protocol !== 'https:' || background.username || background.password ||
      (background.hostname !== 'uguu.se' && !background.hostname.endsWith('.uguu.se'))) {
    throw new Error('Lien Uguu invalide')
  }
  return background.href
}

async function createMeme({ image, mime, caption, request = fetch }) {
  if (!Buffer.isBuffer(image) || image.length === 0 || !MIME_EXTENSIONS.has(mime)) {
    throw new MemeInputError('Joins une image JPEG, PNG ou WebP avec la légende .smeme Haut|Bas.')
  }
  if (image.length > MAX_IMAGE_BYTES) throw new MemeInputError('Choisis une image de 5 Mo maximum.')
  const separator = caption.indexOf('|')
  const top = (separator === -1 ? caption : caption.slice(0, separator)).trim()
  const bottom = separator === -1 ? '' : caption.slice(separator + 1).trim()
  if (!top && !bottom) throw new MemeInputError('Ajoute une légende, par exemple .smeme En haut|En bas.')
  if ([top, bottom].some(line => Buffer.byteLength(line) > 120)) {
    throw new MemeInputError('Raccourcis le texte en haut ou en bas.')
  }

  const background = await uploadBackground(image, mime, request)
  const url = new URL(`${MEMEGEN}/${encodeCaption(top)}/${encodeCaption(bottom)}.png`)
  url.searchParams.set('background', background)
  url.searchParams.set('width', '512')
  url.searchParams.set('height', '512')
  const result = await request(url.href, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  if (!result.ok || !/^image\/png(?:;|$)/i.test(result.headers.get('content-type') ?? '')) {
    throw new Error(`Memegen n’a pas renvoyé d’image PNG (HTTP ${result.status})`)
  }
  return Buffer.from(await result.arrayBuffer())
}

module.exports = { menu, createMeme, MemeInputError }
