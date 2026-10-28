# GoldApp

Application iPhone (ajoutée à l’écran d’accueil depuis Safari) pour suivre les cours de
l’or et répondre en déplacement à « combien vous rachetez ce produit ? ». Hébergée sur
Render (`render.yaml`) à partir du dépôt GitHub. Aucune donnée client n’est stockée sur le
serveur.

## Deux onglets

- **Cours** : or pur 1 kg et son graphique, pièces et lingots CPoR, argent. Sous chaque
  pièce ou lingot d’or : le prix de **rachat** (prix net client : FC du calcul d’achat,
  8 % par défaut, puis TMP 11,5 %). Toucher un produit ouvre le détail (frais, TMP/TPV).
- **Rachat** : estimation client multi-lignes et impression, achat bijoux (9K à 22K),
  prix rapide d’une pièce d’or.

Mise en page et icône reprises de GoldGestion. L’application est pensée pour l’iPhone
uniquement.

## Sources des cours

| Cours | Source | Secours |
|---|---|---|
| Or pur · 1 kg | Kitco, cours Bid en €/kg | BullionVault, signalé à l’écran |
| Pièces et lingots | Cotations CPoR (Loomis) | derniers cours conservés |
| Argent C3E achat (bijoux argent) | Cookson-Clal | derniers cours conservés |
| Pièces d’argent | Gold.fr | derniers cours conservés |
| Graphique | BullionVault | dernier historique conservé |

## Fichiers

- `index.html`, `style.css` : page et mise en page (couleurs GoldGestion).
- `app.js` (cours, prix d’achat), `gold-chart.js`, `silver.js`, `c3e.js`, `freshness.js`.
- Calculs repris de GoldApp : `estimation.js` + `estimation.css`, `alignment.js`,
  `fiscal.js`, `mobile.js` (onglets, achat bijoux), `quick-prices.js`, `print.js`.
- Serveur : `server.py` et `kitco.py`, `cpor.py`, `bullionvault*.py`, `market.py`.
- `icon.svg`, `icon.png`, `favicon.ico` : icône de GoldGestion.
- `docs/historique/` : anciennes notes de version (non publiées).

## Nouvelle version

Changer `VERSION` dans `sw.js` et les `?v=` de `index.html` (même valeur).

## Tests

    python -m unittest discover -s tests -t .
