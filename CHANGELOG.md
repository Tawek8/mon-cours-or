# Historique

## 28/10/2026 — tirer pour actualiser

- Le bouton « Actualiser » de l’en-tête est remplacé par le geste : tirer l’écran vers le
  bas depuis le haut. Une pastille suit le doigt (« Relâche pour actualiser »), une roulette
  tourne en haut à droite pendant l’actualisation. Le geste marche aussi en partant d’une
  carte produit (pas depuis le graphique, réservé à la lecture des cours).

## 28/10/2026 — graphique de l’argent

- Choix Or / Argent sur le graphique (historique BullionVault, comme GoldGestion) ;
  le choix est retenu. Pour l’argent, le cours affiché est le dernier point BullionVault.

## 28/10/2026 — graphique en premier

- Onglet Cours : le cours de l’or et son graphique en tête, avant la recherche et les favoris.

## 28/10/2026 — mot de passe

- Mot de passe à l’ouverture (variable GOLDAPP_PASSWORD sur Render), retenu 180 jours
  sur l’iPhone ; « Verrouiller l’application » en bas de l’onglet Cours.
- Sans mot de passe, ni la page, ni les cours, ni les scripts ne sont lisibles
  (seule l’icône l’est, pour l’écran d’accueil).
- Dépôt nettoyé : fins de ligne uniformes (.gitattributes).

## 28/10/2026 — confort en déplacement

- Onglets Cours / Rachat en bas de l’écran, au pouce.
- Recherche en haut des cours (« napo », « krug », « 100 g »…).
- Favoris : appui long sur un produit pour l’épingler en haut des cours.
- Variation de l’or sur la période (↑ vert / ↓ rouge) et bulle de lecture sur le graphique.
- Bandeau d’alerte quand le cours de l’or a plus de 30 min.
- Les prix qui changent à l’actualisation clignotent en vert ou en rouge.
- Écran d’ouverture ; vignettes d’argent en meilleure qualité, rondes.

## 28/10/2026 — illustrations de l’argent

- Cours de l’Argent : une vignette par pièce et lingot (images Gold.fr), en cartes
  comme les cours de l’or.

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
