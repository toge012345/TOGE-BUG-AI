import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { jidNormalizedUser, useMultiFileAuthState } from 'baileys'
import { bindCommands } from './messages.mjs'
import { createPairingHandler, normalizePairingNumber } from './pairing.mjs'

test('le numéro est normalisé et doit inclure un indicatif international', () => {
  assert.equal(normalizePairingNumber('+243 800 000 001'), '243800000001')
  assert.throws(() => normalizePairingNumber('0800 000 001'), /indicatif/)
  assert.throws(() => normalizePairingNumber('+243ABC'), /indicatif/)
})

test('le code est demandé une fois quand le socket est prêt, avec un numéro par compte', async () => {
  const requested = []
  const codes = []
  const handlers = ['243800000001', '243800000002'].map((phone, index) => {
    const socket = {
      authState: { creds: { registered: false } },
      async requestPairingCode(number) {
        requested.push(number)
        return `ABCD000${index}`
      },
    }
    return createPairingHandler(socket, phone, {
      isCurrent: () => true,
      onCode: code => codes.push(code),
      onError: () => assert.fail('La demande de code doit réussir'),
    })
  })
  await Promise.all(handlers.map(handler => handler({ connection: 'connecting' })))
  assert.deepEqual(requested, [])
  await Promise.all(handlers.flatMap(handler => [handler({ qr: 'ready' }), handler({ qr: 'refreshed' })]))
  assert.deepEqual(requested, ['243800000001', '243800000002'])
  assert.deepEqual(codes, ['ABCD0000', 'ABCD0001'])
})

test('une session déjà liée ne demande pas de code et une demande échouée peut être retentée', async () => {
  const creds = { registered: true }
  let requests = 0
  let errors = 0
  const codes = []
  const handler = createPairingHandler({
    authState: { creds },
    async requestPairingCode() {
      if (++requests === 1) throw new Error('Session temporairement indisponible')
      return 'ABCD0001'
    },
  }, '243800000001', {
    isCurrent: () => true,
    onCode: code => codes.push(code),
    onError: () => { errors++ },
  })
  await handler({ qr: 'ready' })
  assert.equal(requests, 0)
  creds.registered = false
  await handler({ qr: 'ready' })
  await handler({ qr: 'refreshed' })
  assert.equal(requests, 2)
  assert.equal(errors, 1)
  assert.deepEqual(codes, ['ABCD0001'])
})

test('Baileys enregistre et recharge les identifiants de deux comptes séparément', async t => {
  const root = await mkdtemp(join(tmpdir(), 'doma-auth-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const dirs = [join(root, 'a'), join(root, 'b')]
  const [first, second] = await Promise.all(dirs.map(useMultiFileAuthState))
  first.state.creds.me = { id: '10000000001@s.whatsapp.net' }
  second.state.creds.me = { id: '10000000002@s.whatsapp.net' }
  await Promise.all([first.saveCreds(), second.saveCreds()])
  const restored = await Promise.all(dirs.map(useMultiFileAuthState))
  assert.deepEqual(restored.map(x => x.state.creds.me.id), [first.state.creds.me.id, second.state.creds.me.id])
  assert.notDeepEqual(restored[0].state.creds.noiseKey.public, restored[1].state.creds.noiseKey.public)
})

test('chaque socket répond à son compte et ignore les autres conversations', async () => {
  const replies = []
  const first = '10000000001@s.whatsapp.net'
  const second = '10000000002@s.whatsapp.net'
  const firstLid = '20000000001@lid'
  const message = (remoteJid, fromMe = true) => ({ key: { remoteJid, fromMe }, message: { conversation: '.menu' } })
  const handlers = [
    { id: '10000000001:2@s.whatsapp.net', lid: firstLid },
    { id: second },
  ].map(user => bindCommands({ user, sendMessage: async (jid, payload) => replies.push([user.id, jid, payload.text]) }, { jidNormalizedUser }))

  const messages = [message(first), message(firstLid), message(second), message(first, false), message('123@g.us')]
  await Promise.all(handlers.map(handler => handler({ type: 'append', messages })))
  assert.deepEqual(replies, [])
  for (const handler of handlers) await handler({ type: 'notify', messages })
  assert.deepEqual(replies.map(([account, jid]) => [account, jid]), [
    ['10000000001:2@s.whatsapp.net', first], ['10000000001:2@s.whatsapp.net', firstLid], [second, second],
  ])
  assert.ok(replies.every(([, , reply]) => reply.includes('DOMA BUG')))
})

test('le socket reçoit un WebP en tant que sticker après une commande sur une image citée', async t => {
  const jid = '10000000001@s.whatsapp.net'
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEklEQVR4nGP4Uqj2HxkzoAsAAFopFFFg4Q/DAAAAAElFTkSuQmCC', 'base64')
  const photo = { mimetype: 'image/png', fileLength: png.length }
  const sent = []
  t.mock.method(globalThis, 'fetch', async url => new URL(url).hostname === 'uguu.se'
    ? Response.json({ success: true, files: [{ url: 'https://a.uguu.se/test.png' }] })
    : new Response(png, { headers: { 'content-type': 'image/png' } }))
  const handler = bindCommands({ user: { id: jid }, sendMessage: async (...args) => sent.push(args) }, {
    jidNormalizedUser,
    async downloadContentFromMessage(message, mediaType) {
      assert.equal(message, photo)
      assert.equal(mediaType, 'image')
      return [png]
    },
  })
  await handler({ type: 'notify', messages: [{
    key: { remoteJid: jid, fromMe: true },
    message: { extendedTextMessage: { text: '.smeme Bonjour', contextInfo: { quotedMessage: { imageMessage: photo } } } },
  }] })
  assert.equal(sent.length, 1)
  const [[destination, payload]] = sent
  assert.equal(destination, jid)
  assert.equal(payload.sticker.toString('ascii', 8, 12), 'WEBP')
})
