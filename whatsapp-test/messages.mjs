import { handleDomaMessage } from '../test/doma-message-handler.cjs'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function bindCommands(socket, { downloadContentFromMessage, jidNormalizedUser }) {
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

  return async function onMessages({ type, messages }) {
    if (type !== 'notify' || !socket.user) return
    const ownJids = [socket.user.id, socket.user.lid].filter(Boolean).map(jidNormalizedUser)

    for (const entry of messages) {
      const { key } = entry
      if (!key.fromMe || !key.remoteJid || !ownJids.includes(jidNormalizedUser(key.remoteJid))) continue
      const { conversation, extendedTextMessage, imageMessage } = entry.message ?? {}
      const quotedImage = extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
      await handleDomaMessage({
        chat: key.remoteJid,
        body: conversation ?? extendedTextMessage?.text ?? imageMessage?.caption,
        mtype: imageMessage ? 'imageMessage' : undefined,
        msg: imageMessage,
        quoted: quotedImage ? { mtype: 'imageMessage', msg: quotedImage } : undefined,
      }, {
        downloadImage,
        sendText: (jid, text) => socket.sendMessage(jid, { text }),
        sendSticker: (jid, sticker) => socket.sendMessage(jid, { sticker }),
      })
    }
  }
}
