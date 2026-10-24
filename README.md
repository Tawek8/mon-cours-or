# Mon Cours de l’Or

Version web et iPhone de la Proposition de rachat de GoldApp, hébergée sur Render
(`render.yaml`). Usage personnel : aucune donnée client n’est stockée sur le serveur.

## Démarrage

- Render : déposer le contenu de ce dossier à la racine du dépôt GitHub ; Render lance
  `python server.py` (aucun module supplémentaire).
- Windows : double-cliquer sur `DEMARRER-WINDOWS.bat`, puis ouvrir http://localhost:8080.

## Sources des cours (identiques à GoldApp)

| Cours | Source | Secours |
|---|---|---|
| Or pur · 1 kg (valeur intrinsèque, fonte, bijoux) | Kitco, cours Bid en €/kg | BullionVault (marché ouvert 24 h/24), signalé à l’écran |
| Pièces et lingots boursables | Cotations CPoR (Loomis) | derniers cours conservés |
| Argent C3E achat (bijoux argent) | Cookson-Clal | derniers cours conservés |
| Pièces d’argent | Gold.fr (comme GoldApp) | derniers cours conservés |
| Graphique | BullionVault | dernier historique conservé |

Le serveur garde chaque cours quelques secondes en cache (30 s pour l’or et le CPoR,
60 s pour l’argent) pour ne pas solliciter les sites à chaque actualisation.

## Calculs

Les fichiers de calcul (`estimation.js`, `alignment.js`, `fiscal.js`) sont ceux de
GoldApp : détail FC Agence / % GT, décotes argent, or dentaire, lingots personnalisés,
alignement bijoux. Pour une mise à jour, recopier ces fichiers depuis
`Programme/goldapp/` de GoldApp, puis changer `VERSION` dans `sw.js` et le `?v=` de
`index.html`.

## Fichiers publiés

Le serveur ne publie que les fichiers de l’application (`.html`, `.js`, `.css`,
images). Le code serveur, `render.yaml` et les notes de `docs/` ne sont pas accessibles
depuis Internet.

## Tests

    python -m unittest tests.test_server
    for t in tests/js/*.js; do node "$t"; done

Les anciennes notes de version sont rangées dans `docs/historique/`.
