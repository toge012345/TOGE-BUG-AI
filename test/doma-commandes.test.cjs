'use strict'

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { test } = require('node:test')
const { handleDomaMessage } = require('./doma-message-handler.cjs')

const chat = 'test-chat'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEklEQVR4nGP4Uqj2HxkzoAsAAFopFFFg4Q/DAAAAAElFTkSuQmCC', 'base64')
const background = 'https://a.uguu.se/test.png'

test('.menu envoie le nom, la signature et le lien de la chaîne', async () => {
  const handled = await handleDomaMessage({ body: '.menu', chat }, {
    sendText: async (destination, text) => {
      assert.equal(destination, chat)
      assert.match(text, /DOMA BUG/)
      assert.match(text, /Son Altesse/)
      assert.match(text, /https:\/\/whatsapp\.com\/channel\/0029Vb6aMu46RGJOcGGe1H1O/)
    },
  })
  assert.equal(handled, true)
})

for (const quoted of [false, true]) {
  test(`.smeme prépare le sticker depuis une image ${quoted ? 'citée' : 'jointe'}`, async () => {
    const attachment = { mtype: 'imageMessage', mimetype: 'image/png' }
    const message = { chat, body: '.smeme Haut?|Bas / #2' }
    const source = quoted
      ? Object.assign(message, { quoted: attachment }).quoted
      : Object.assign(message, { mtype: 'imageMessage', msg: attachment })
    const calls = []
    const handled = await handleDomaMessage(message, {
      downloadImage: async input => {
        calls.push('download')
        assert.equal(input, source)
        return png
      },
      request: async (url, options) => {
        const parsed = new URL(url)
        calls.push(parsed.hostname)
        if (parsed.hostname === 'uguu.se') {
          assert.equal(options.method, 'POST')
          assert.deepEqual(Buffer.from(await options.body.get('files[]').arrayBuffer()), png)
          return Response.json({ success: true, files: [{ url: background }] })
        }
        assert.equal(parsed.pathname, '/images/custom/Haut~q/Bas_~s_~h2.png')
        assert.equal(parsed.searchParams.get('background'), background)
        return new Response(png, { headers: { 'content-type': 'image/png' } })
      },
      sendSticker: async (destination, image, original) => {
        calls.push('sticker')
        assert.equal(destination, chat)
        assert.equal(original, message)
        assert.ok(image.length <= 100_000)
        const metadata = execFileSync('ffprobe', [
          '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height',
          '-of', 'json', 'pipe:0',
        ], { input: image, encoding: 'utf8', timeout: 10000 })
        assert.deepEqual(JSON.parse(metadata).streams, [{ codec_name: 'webp', width: 512, height: 512 }])
      },
    })
    assert.equal(handled, true)
    assert.deepEqual(calls, ['download', 'uguu.se', 'api.memegen.link', 'sticker'])
  })
}

test('.smeme demande une image quand le message ne contient que du texte', async () => {
  const replies = []
  await handleDomaMessage({ chat, body: '.smeme Haut|Bas' }, {
    sendText: async (_destination, text) => replies.push(text),
  })
  assert.match(replies.join(), /Joins une image/)
})

test('.smeme signale une panne du fournisseur dans le chat de test', async () => {
  const replies = []
  await handleDomaMessage({ chat, body: '.smeme Haut', mtype: 'imageMessage', msg: { mimetype: 'image/png' } }, {
    downloadImage: async () => png,
    request: async () => new Response(null, { status: 503 }),
    sendText: async (_destination, text) => replies.push(text),
  })
  assert.match(replies.join(), /La génération du sticker a échoué/)
})

test('.smeme signale une image générée invalide avant de tenter un envoi', async () => {
  const replies = []
  const handled = await handleDomaMessage({ chat, body: '.smeme Haut', mtype: 'imageMessage', msg: { mimetype: 'image/png' } }, {
    downloadImage: async () => png,
    request: async url => new URL(url).hostname === 'uguu.se'
      ? Response.json({ success: true, files: [{ url: background }] })
      : new Response('PNG invalide', { headers: { 'content-type': 'image/png' } }),
    sendText: async (_destination, text) => replies.push(text),
    sendSticker: async () => assert.fail('Un sticker invalide ne doit pas être envoyé'),
  })
  assert.equal(handled, true)
  assert.match(replies.join(), /La génération du sticker a échoué/)
})

test('Le gestionnaire de test ignore les commandes hors de son périmètre', async () => {
  assert.equal(await handleDomaMessage({ chat, body: '.ping' }, {}), false)
})
