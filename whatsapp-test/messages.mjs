import { handleDomaMessage } from '../test/doma-message-handler.cjs'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function bindCommands(socket, { downloadContentFromMessage, jidNormalizedUser, normalizeMessageContent }, logMenu = () => {}) {
  const connectedSince = Math.floor(Date.now() / 1000)
  const handledMenus = new Set()

  async function downloadImage({ msg }) {
    if (Number(msg.fileLength) > MAX_IMAGE_BYTES) throw new Error('Image trop volumineuse')
    const stream = await downloadContentFromMessage(msg, 'image')
    const chunks = []
    let bytes = 0
    for await (const chunk of stream) {
      bytes += chunk.length
      if (bytes > MAX_IMAGE_BYTES) throw new Error('Image trop volumineuse')
      chunks.push(chunk)
    }
    return Buffer.concat(chunks, bytes)
  }

  return async function onMessages({ type, messages, requestId }) {
    if (requestId || !socket.user || (type !== 'notify' && type !== 'append')) return
    const ownJids = new Set([socket.user.id, socket.user.lid].filter(Boolean).map(jidNormalizedUser))

    for (const entry of messages) {
      const { key } = entry
      const { conversation, extendedTextMessage, imageMessage } = entry.message ?? {}
      const normalized = normalizeMessageContent(entry.message)
      const text = normalized?.conversation ?? normalized?.extendedTextMessage?.text ?? normalized?.imageMessage?.caption
      const isMenu = /^\.menu(?:\s|$)/i.test(text?.trim() ?? '')
      const timestamp = Number(entry.messageTimestamp)
      if (type === 'append' && (!isMenu || !key.id || !Number.isFinite(timestamp) || timestamp < connectedSince)) continue
      if (!key.fromMe || !key.remoteJid || !ownJids.has(jidNormalizedUser(key.remoteJid))) {
        if (isMenu && key.fromMe) logMenu('Commande .menu ignorée : conversation personnelle non reconnue.')
        continue
      }

      if (isMenu) {
        if (key.id && handledMenus.has(key.id)) continue
        if (key.id) {
          if (handledMenus.size >= 128) handledMenus.delete(handledMenus.values().next().value)
          handledMenus.add(key.id)
        }
        logMenu(`Commande .menu reçue (${type}).`)
      }

      const quotedImage = extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
      await handleDomaMessage({
        chat: key.remoteJid,
        body: isMenu ? text : conversation ?? extendedTextMessage?.text ?? imageMessage?.caption,
        mtype: imageMessage ? 'imageMessage' : undefined,
        msg: imageMessage,
        quoted: quotedImage ? { mtype: 'imageMessage', msg: quotedImage } : undefined,
      }, {
        downloadImage,
        async sendText(jid, text) {
          try {
            await socket.sendMessage(jid, { text })
          } catch (error) {
            if (isMenu && key.id) handledMenus.delete(key.id)
            throw error
          }
        },
        sendSticker: (jid, sticker) => socket.sendMessage(jid, { sticker }),
      })
    }
  }
}
