# Fraîcheur des cours

Une indication discrète et dépliable apparaît sous le titre Estimation client, sur PC et iPhone. Elle concerne uniquement les sources utilisées par les lignes saisies ; sans ligne, elle montre les trois sources de calcul.

- Or Gold.fr / CPoR, argent boursable Gold.fr, argent C3E : dates de récupération distinctes.
- Rappel si la dernière récupération date de plus de 30 minutes. Il s’agit d’un seuil de vigilance de l’application, pas d’une garantie de cotation en temps réel.
- Échec de la dernière actualisation, récupération partielle, saisie manuelle ou date inconnue/future : signalement discret. Les derniers cours restent utilisés selon le comportement existant et les champs incomplets restent signalés comme tels.
- Pour C3E, la date du cours publié apparaît séparément de la date de récupération. Une récupération réussie aujourd’hui peut donc afficher un cours publié un autre jour ; le message ne prétend pas que la cotation a changé aujourd’hui.
- Les dates de récupération sont celles déjà transmises par les API ; l’application ne les remplace pas par l’heure d’une tentative échouée. Le chargement d’une ancienne donnée n’efface pas un échec d’actualisation mémorisé.
- Le rappel d’âge est recalculé chaque minute et au retour de l’application au premier plan. Aucun blocage de saisie ni changement de calcul.

L’impression directe, le logo abaissé de 10 mm, le dentaire jaune et les autres fonctions sont conservés. Les informations de fraîcheur restent sur l’écran de saisie.

Contrôles : seuil, dates invalides/futures, erreurs, saisie manuelle, réponse partielle et distinction de dates C3E ; parcours PC/mobile avec une panne C3E suivie d’une récupération réussie ; régression du parcours d’impression directe à 2, 4 et 10 lignes.
