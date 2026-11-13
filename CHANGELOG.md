# Historique

## 13/11/2026 — Météo : fiabilité de « Et ensuite ? »

- Chaque pourcentage a sa fourchette (là où il tombe 9 fois sur 10, en tirant au sort des
  épisodes entiers) ; couleur seulement si l’écart avec « tous temps confondus » est net.
- Même calcul avant et depuis 2016 : un chiffre qui change de plus de 15 points est signalé
  « instable ». Même calcul que dans Orbis (meteo_or.py).

## 13/11/2026 — Alerte de cours, commune avec Orbis

- Onglet Météo : « Alerte de cours » (prévenir si l’or passe au-dessus ou en dessous d’un
  cours en €/kg). Mêmes seuils que dans Orbis : réglés d’un côté, ils valent partout.
- Notification sur l’iPhone, même OrApp fermée, par l’appli gratuite ntfy (canal secret tiré
  du mot de passe, affiché dans l’onglet). L’alerte sonne une fois puis le seuil est retiré.
- Contrôle du cours toutes les 10 minutes en semaine par GitHub Actions
  (`.github/workflows/alerte-cours.yml`), qui garde aussi le service Render éveillé.
- `alerte.py` : même calcul que `alerte_cours.py` d’Orbis ; Orbis échange avec `/api/alert`
  grâce à une clé tirée du mot de passe (`X-Alert-Key`), jamais le mot de passe lui-même.

## 13/11/2026 — Météo de l’or : historique et « Et ensuite ? »

- Même calcul que la météo d’Orbis : frise des 4 dernières semaines (météo de chaque jour
  ouvré, recalculée avec les cours de fin de journée) et « Et ensuite ? » : ce qui a suivi,
  depuis 2005, les jours de même météo (or plus haut après 1 semaine, 1 mois, 3 mois,
  comparé à tous les jours). Fréquences du passé, pas une prévision.
- Une source qui ne répond pas est nommée clairement (« taux américains », « indice de la
  peur »…) et relue au bout de 5 minutes au lieu de 30.

## 09/11/2026 — GoldApp devient OrApp

- Nouveau nom et nouvelle icône, celle d’Orbis : l’anneau doré et ses trois points.
- Logo complet : `orapp-logo.svg` / `orapp-logo.png`.
- Sur l’iPhone, le nom et l’icône de l’écran d’accueil ne changent qu’en réinstallant l’app
  (Safari, Partager, Sur l’écran d’accueil). Le widget Scriptable affiche « OrApp » une fois
  le nouveau script collé.

## 02/11/2026 — Onglet Météo allégé

- Retrait de l’encadré « Résumé du contexte, pas une prévision… », qui prenait trop de place
  sur l’iPhone. La mention « à titre informatif » reste en bas de l’onglet.

## 02/11/2026 — Frais d’achat par défaut

- Or : 4 % sur le lingot 1 kg, 7,5 % sur les autres pièces et lingots (cours, détail, prix
  rapide, estimation client). Un frais modifié dans le détail ne vaut que pour ce détail.

## 02/11/2026 — Météo de l’or après test sur 22 ans

- Rejouée sur 2005-2026 : pas d’avantage mesurable à 1 semaine ou 1 mois, signal faible et
  instable au-delà. Elle est donc présentée comme un résumé du contexte, pas une prévision.
- Dollar et euro passent en simples repères : ils se contredisaient 2 123 jours sur 2 128.
  Seuils adaptés (0,25 et 0,63) : même météo qu’avant 95 % des jours.
- Une pondération calée sur les résultats n’a pas battu les poids actuels sur les années non
  vues : poids inchangés.

## 02/11/2026 — Météo de l’or

- Nouvel onglet « Météo » entre Cours et Rachat : soleil, éclaircies, temps variable, averses
  ou orage selon les indices de tendance, avec le détail et l’explication de chacun.
  Mêmes indices, seuils et textes que dans GoldGestion (meteo_or.py, tests repris).
- Dernière météo gardée sur l’iPhone si les sources ne répondent pas.

## 29/10/2026 — widget plein

- La courbe du widget remplit tout l’espace libre : taille réelle du widget selon le modèle
  d’iPhone (du SE au Pro Max), au lieu de dimensions fixes.

## 28/10/2026 — widget iPhone

- Widget d’écran d’accueil (app Scriptable) : cours de l’or ou de l’argent avec sa
  courbe et sa variation ; trois tailles, période au choix. Voir widget/LISEZ-MOI-WIDGET.txt.
- /api/widget : lecture seule des cours, ouverte par une clé à part (GOLDAPP_WIDGET_KEY).
- Relecture du widget : compatible iOS 14+, tailles ajustées pour l’iPhone SE, messages
  clairs (clé à coller, clé refusée), délai court pour garder le dernier relevé.

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
