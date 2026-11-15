process.argv.splice(2, process.argv.length - 2, '--hosted')
await import('./whatsapp-test/index.mjs')
