export function normalizePairingNumber(input) {
  const phone = input.trim().replace(/[\s().-]/g, '').replace(/^\+/, '')
  if (!/^[1-9]\d{6,14}$/.test(phone)) {
    throw new Error('Entre le numéro complet avec l’indicatif du pays, par exemple +243…')
  }
  return phone
}

export function createPairingHandler(socket, phone, { isCurrent, onCode, onError }) {
  let requested = false
  return async function onPairingUpdate({ qr }) {
    if (!qr || !phone || requested || !isCurrent() || socket.authState.creds.registered) return
    requested = true
    try {
      const code = await socket.requestPairingCode(phone)
      if (isCurrent() && !socket.authState.creds.registered) onCode(code)
    } catch {
      requested = false
      if (isCurrent()) onError()
    }
  }
}
