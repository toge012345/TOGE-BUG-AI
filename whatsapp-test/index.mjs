import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as baileys from 'baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { bindCommands } from './messages.mjs'

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys
const logger = pino({ level: 'silent' })
const terminalFailures = new Set([
  DisconnectReason.loggedOut, DisconnectReason.badSession, DisconnectReason.connectionReplaced,
  DisconnectReason.multideviceMismatch, DisconnectReason.forbidden,
])

async function probe() {
  const dir = await mkdtemp(join(tmpdir(), 'doma-wa-probe-'))
  try {
    const { state } = await useMultiFileAuthState(dir)
    const socket = makeWASocket({ auth: state, logger, connectTimeoutMs: 15000 })
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Délai dépassé avant réception du QR.')), 20000)
      function finish(error) {
        clearTimeout(timer)
        socket.ev.off('connection.update', onUpdate)
        socket.end(undefined)
        if (error) reject(error)
        else resolve()
      }
      function onUpdate({ qr, connection, lastDisconnect }) {
        if (qr) finish()
        else if (connection === 'close') finish(lastDisconnect?.error ?? new Error('Connexion fermée.'))
      }
      socket.ev.on('connection.update', onUpdate)
    })
    console.log('WhatsApp a répondu avec un QR d’appairage. Aucun compte lié.')
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

async function startSessions(names) {
  const root = fileURLToPath(new URL('./sessions/', import.meta.url))
  await mkdir(root, { recursive: true, mode: 0o700 })
  const sessions = new Map()
  const stop = new AbortController()
  const requestStop = () => stop.abort()
  process.once('SIGINT', requestStop)
  process.once('SIGTERM', requestStop)

  try {
    for (const name of names) {
      if (stop.signal.aborted) return
      const dir = join(root, name)
      await mkdir(dir, { recursive: true, mode: 0o700 })
      const lock = join(dir, '.running')
      try {
        await mkdir(lock, { mode: 0o700 })
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
        throw new Error(`[${name}] Session déjà verrouillée. Arrête l’autre instance avant de réessayer.`)
      }
      sessions.set(name, { dir, lock, delay: 1000, pendingSave: Promise.resolve() })
    }

    async function connect(name, session) {
      if (stop.signal.aborted) return
      const { state, saveCreds } = await useMultiFileAuthState(session.dir)
      if (stop.signal.aborted) return
      const socket = makeWASocket({
        auth: state,
        logger,
        connectTimeoutMs: 15000,
        markOnlineOnConnect: false,
        shouldSyncHistoryMessage: () => false,
      })
      session.socket = socket

      socket.ev.on('creds.update', () => {
        session.pendingSave = session.pendingSave.then(saveCreds).catch(() => {
          console.error(`[${name}] Impossible d’enregistrer les identifiants de session.`)
        })
      })
      const onMessages = bindCommands(socket, baileys)
      socket.ev.on('messages.upsert', update => {
        onMessages(update).catch(() => console.error(`[${name}] Échec du traitement du message.`))
      })
      socket.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
        if (stop.signal.aborted || session.socket !== socket) return
        if (qr) {
          console.log(`[${name}] Scanne ce QR depuis Appareils connectés dans WhatsApp.`)
          qrcode.generate(qr, { small: true })
        }
        if (connection === 'open') {
          session.delay = 1000
          console.log(`[${name}] Connecté à WhatsApp.`)
        }
        if (connection !== 'close') return
        session.socket = undefined
        const code = lastDisconnect?.error?.output?.statusCode
        if (terminalFailures.has(code)) {
          console.error(`[${name}] Session arrêtée par WhatsApp (${code}).`)
          return
        }
        const delay = code === DisconnectReason.restartRequired ? 0 : session.delay
        session.delay = Math.min(session.delay * 2, 30000)
        console.log(`[${name}] Reconnexion dans ${delay / 1000} s (${code ?? 'connexion interrompue'}).`)
        session.retry = setTimeout(async () => {
          try {
            await session.pendingSave
            await connect(name, session)
          } catch {
            console.error(`[${name}] Impossible de rouvrir la session.`)
          }
        }, delay)
      })
    }

    for (const [name, session] of sessions) await connect(name, session)
    if (!stop.signal.aborted) {
      // Keep the CLI available for an explicit shutdown if all sessions close.
      const keepAlive = setInterval(() => {}, 60_000)
      await new Promise(resolve => stop.signal.addEventListener('abort', resolve, { once: true }))
      clearInterval(keepAlive)
    }
  } finally {
    stop.abort()
    for (const session of sessions.values()) {
      clearTimeout(session.retry)
      session.socket?.end(undefined)
    }
    await Promise.all([...sessions.values()].map(async session => {
      await session.pendingSave
      await rm(session.lock, { recursive: true, force: true })
    }))
    process.removeListener('SIGINT', requestStop)
    process.removeListener('SIGTERM', requestStop)
  }
}

try {
  const names = process.argv.slice(2)
  if (names.length === 1 && names[0] === '--probe') await probe()
  else {
    if (!names.length || new Set(names).size !== names.length || names.some(name => !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name))) {
      throw new Error('Usage : npm start -- compte1 compte2 (noms uniques en minuscules)')
    }
    await startSessions(names)
  }
} catch (error) {
  console.error(`DOMA : ${error.message}`)
  process.exitCode = 1
}
