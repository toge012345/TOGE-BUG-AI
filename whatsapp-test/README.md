# DOMA sur WhatsApp · test multi-session

Prérequis. Node.js 22 ou plus récent, et FFmpeg avec l’encodeur `libwebp` pour `.smeme`.

Depuis la racine de la branche `test/doma-commandes` :

```bash
npm ci --prefix whatsapp-test
npm start --prefix whatsapp-test -- --probe
npm start --prefix whatsapp-test -- compte1 compte2
```

`--probe` vérifie si WhatsApp renvoie un QR sans l’afficher ni appairer de compte. Pour l’appairage, le terminal affiche un QR identifié par nom de session. Scanne chaque QR depuis **WhatsApp → Appareils connectés → Connecter un appareil** avec le compte correspondant. Attends la ligne `[compte1] Connecté à WhatsApp.` pour le premier compte, puis l’équivalent pour le second.

Dans la conversation avec toi-même de chaque compte, envoie `.menu`, puis une image avec la légende `.smeme En haut|En bas`. Tu peux également répondre à une image avec la même commande. Pour `.smeme`, utilise une image de test que tu acceptes d’envoyer à Uguu et à Memegen.

Les sessions sont enregistrées sous `whatsapp-test/sessions/`, dans un dossier par compte. Garde ces fichiers privés. Pour reprendre une session, relance la commande avec le même nom. Arrête le processus avec **Ctrl+C**. Après un arrêt brutal, retire le dossier `.running` de la session concernée uniquement après avoir vérifié que le processus est arrêté.

Pour les tests locaux :

```bash
node --test test/doma-commandes.test.cjs whatsapp-test/whatsapp.test.mjs
```
