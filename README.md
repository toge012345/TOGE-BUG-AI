# Doma · Test de jumelage sur Bot-Hosting.net

1. Ouvre l’onglet **Startup** de ton serveur Node.js. Vérifie le dépôt
   `https://github.com/Chadro14/TOGE-BUG-AI`, choisis la branche
   `test/doma-bot-hosting` et indique `index.js` comme fichier de démarrage.
2. Dans **Files**, crée un fichier `.env` à côté de `package.json`. Sur une
   ligne, écris `DOMA_WHATSAPP_NUMBER=` suivi de ton propre numéro WhatsApp
   avec son indicatif international.
3. Démarre le serveur. Dans ta console privée, relève le code d’appairage.
   Sur ton téléphone, ouvre **WhatsApp → Appareils connectés → Connecter
   un appareil → Associer avec un numéro de téléphone** et saisis le code.
4. Quand la console affiche **Connecté à WhatsApp**, essaie `.menu` dans
   ta conversation avec toi-même. La commande `.smeme` nécessite FFmpeg.

Cette branche déploie le test d’un compte. Les identifiants de session sont
stockés dans `whatsapp-test/sessions/`. Garde ton code d’appairage et tes
fichiers de session privés. Si ton panneau ne récupère pas le changement de
branche au redémarrage, sauvegarde tes fichiers et tes sessions avant toute
réinstallation du serveur.
