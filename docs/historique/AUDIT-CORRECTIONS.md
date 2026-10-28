# Audit et corrections — 16 octobre 2026

## Fiscalité

Le mode « Comparer TMP / TPV » de l’estimation calcule les deux taxes et retient la moins élevée. La taxe retenue alimente la ligne ET le total net client ; le détail indique les deux montants et le régime choisi. Tant que le prix d’acquisition et la date ne sont pas valides et confirmés, TMP est appliquée. L’option TMP seule reste disponible.

Le comparateur accessible depuis une cotation CPoR utilise la même règle et met aussi à jour son résultat principal. Les fonctions de calcul de durée et d’abattement sont partagées dans fiscal.js pour éviter les divergences entre les deux écrans.

Vérifié notamment : TMP moins chère, TPV moins chère, moins-value, acquisition à zéro, absence de données, anniversaire de détention, exonération à 22 ans, date future, date impossible et année bissextile. Les taux existants sont conservés ; l’option TPV reste conditionnée à la possibilité de justifier l’acquisition et d’identifier les biens.

Sources fiscales consultées :
- https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mes-autres-impots-et-taxes/vente-dobjets-precieux-quelle
- https://bofip.impots.gouv.fr/bofip/4161-PGP.html/identifiant%3DBOI-RPPM-PVBMC-20-20-20140121

## Date et saisie mobile

- Bouton explicite « Valider la date » dans l’estimation et le comparateur. Les changements intermédiaires du sélecteur ne confirment pas la date.
- Champs conservés dans le DOM pour les changements de montant, quantité, poids et date. Une arrivée de cours ne reconstruit plus les lignes : le calendrier et la recherche restent en place.
- Date limitée à une date complète, valide et non future. Taille du champ date fixée à 44 px, largeur limitée à sa colonne et style natif normalisé sur mobile.
- Quantités de pièces entières, montants et poids non négatifs ; une saisie vide ou invalide n’est plus interprétée comme un prix nul ou une acquisition gratuite.

## Autres erreurs réparées

- Chargement automatique des cotations d’or au démarrage, précédemment absent.
- Premier affichage exécuté après l’initialisation des variables utilisées par les fonctions d’affichage.
- Navigation achat sur PC : suppression d’un accès à une barre d’outils inexistante après déplacement du bouton Actualiser dans le titre.
- Échappement des textes saisis avant insertion dans le récapitulatif HTML.
- Suppression de deux alias erronés Half Eagle / Quarter Eagle dans le connecteur des pièces d’or US. Les libellés numériques 10 et 5 dollars sont conservés.
- Cache de l’application versionné pour charger les nouveaux scripts.

## Périmètre vérifié et limites

Relecture de tous les fichiers JavaScript, du serveur Python, de l’intégration HTML, des styles mobiles, du cache et des flux de saisie. Contrôles syntaxiques, tests automatisés des règles et gestionnaires d’événements, démarrage de app.js avec un DOM simulé, régression or / bijoux argent / 18 pièces argent, recherche, accordéon et reset. Connecteurs testés sur le HTML Gold.fr enregistré lors de la première vérification et sur cas représentatifs argent/C3E.

Le lancement du navigateur automatisé et l’accès du navigateur de contrôle au serveur local ont échoué dans cet environnement. Aucun test visuel Safari/iPhone ni validation en direct actuelle des connecteurs n’est revendiqué. Le code du sélecteur natif de date dépend aussi du navigateur ; son comportement final doit être confirmé sur l’appareil. Cet audit ne garantit pas l’absence de toute erreur future.

## Vérifications reproductibles

Depuis la racine du projet, avec Node.js installé :

```
node tests/test_audit.js
node tests/test_app_runtime.js
node tests/test_reset_18.js
node tests/test_search.js
node tests/test_accordion.js
node tests/verify.js
node tests/verify_c3e.js
node tests/verify_silver_coins.js
```

Aucune dépendance Node supplémentaire n’est nécessaire pour ces tests. Render continue à exécuter uniquement le serveur Python.
