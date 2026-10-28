# Historique

## 28/10/2026 — rangement façon GoldGestion

- Deux onglets, Cours et Rachat : les calculs ne sont plus mélangés aux cours.
- Cours : pièces et lingots affichés ensemble en cartes, avec le prix de rachat sous
  chaque produit ; graphique de l’or toujours visible.
- Icône, couleurs et en-tête de GoldGestion.
- iPhone uniquement : la mise en page PC (qui masquait les cours) est supprimée, ainsi
  que DEMARRER-WINDOWS.bat.
- Six feuilles de style empilées remplacées par style.css et estimation.css.
- Notes de version rangées dans docs/historique/ ; fichiers inutilisés retirés
  (bullionvault-chart.html, print-preview.html, print-view.js, print-document.css,
  cotations.exemple.json).

## 24/10/2026 — samedi

- Kitco : quand le marché est fermé (week-end, pause quotidienne), le cours de
  clôture est accepté au lieu d’être refusé ; l’écran indique « Marché fermé ».

## 24/10/2026 — graphique

- Courbe redessinée : dégradé doré, halo, repère du début de période, plus haut et
  plus bas, dernier cours animé, point de lecture au doigt ou à la souris.

## 24/10/2026 — alignement sur GoldApp

- Calculs repris de GoldApp (FC Agence / % GT, décotes argent 20 / 9 / 5 pt,
  alignement bijoux, saisie directe, « Net à verser » indique ce qui manque).
- Cotations CPoR lues chez Loomis (comme GoldApp) au lieu de Gold.fr.
- Or pur : BullionVault en secours quand Kitco ne répond pas (le week-end notamment).
- Illustrations des pièces et lingotins (mêmes images que GoldApp), lingotin 1 once.
- Cache serveur des cours ; seuls les fichiers de l’application sont publiés.
- Code remis en forme, code mort retiré (goldprice.dev, Frankfurter, fichier
  `cotations.json` qui remplaçait les cours en direct), tests ajoutés.
- Notes de version regroupées dans `docs/historique/`.
