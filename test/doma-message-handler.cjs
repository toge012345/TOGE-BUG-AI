'use strict'

const { menu, createMeme, MemeInputError } = require('../doma-commandes.cjs')
const { createStaticSticker } = require('./doma-sticker.cjs')

async function handleDomaMessage(message, { downloadImage, sendText, sendSticker, request }) {
  const match = /^\.(menu|smeme)(?:\s+([\s\S]*))?$/i.exec(message.body?.trim() ?? '')
  if (!match) return false

  const [, command, caption = ''] = match
  if (command.toLowerCase() === 'menu') {
    await sendText(message.chat, menu().text)
    return true
  }

  const source = message.mtype === 'imageMessage' ? message : message.quoted
  if (source?.mtype !== 'imageMessage') {
    await sendText(message.chat, 'Joins une image ou réponds à une image avec .smeme Haut|Bas.')
    return true
  }

  let stickerImage
  try {
    const image = await downloadImage(source)
    const mime = (source.msg ?? source).mimetype
    const png = await createMeme({ image, mime, caption, request })
    stickerImage = await createStaticSticker(png)
  } catch (error) {
    const reply = error instanceof MemeInputError ? error.message : 'La génération du sticker a échoué. Réessaie dans un instant.'
    await sendText(message.chat, reply)
    return true
  }

  await sendSticker(message.chat, stickerImage, message)
  return true
}

module.exports = { handleDomaMessage }
