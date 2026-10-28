# Version iPhone et recherche de produits

Déposer le contenu de ce ZIP à la racine du dépôt GitHub existant, puis laisser Render redéployer. Aucune modification de la surveillance UptimeRobot n’est nécessaire.

Sur iPhone et écrans de moins de 900 px :
- Boutons Cours à gauche et Estimation à droite.
- Vue Cours : spot et graphique déroulant existants, CPoR, prix d’achat 18K avec GtaX et détail de l’intrinsèque et de la base de calcul ; cours argent à la suite.
- Vue Estimation : catalogue complet, champs sur deux colonnes, modes Fonte/Boursable, FC, GtaX, fiscalité TMP/TPV et détails des taxes existants.
- Une ligne ouverte à la fois. Ajouter une ligne ouvre la nouvelle et replie la précédente. Le résumé conserve produit, titrage des bijoux or, poids/quantité et net client. Un appui sur le résumé rouvre la ligne.
- Recherche Produit sur iPhone et PC : suggestions filtrées à la saisie, accents et majuscules ignorés, mots multiples possibles. Flèches et Entrée pour sélectionner au clavier, Échap pour refermer. Aucun résultat ne remplace automatiquement le produit choisi.

La présentation PC pleine largeur est conservée ; toutes ses lignes restent ouvertes. Les pièces d’argent restent en Fonte par défaut, avec FC de 34 % françaises / 20 % modernes. Les formules de calcul existantes ne sont pas changées.

Le prix 18K utilise toujours MIN(CPoR lingot, intrinsèque Gold.fr) × 0,75 / 1000 × (1 − décote / 100). GtaX utilise la référence intrinsèque 750‰, comme sur PC, avant les éventuelles taxes client. Le spot reste indicatif.

Vérifications effectuées : syntaxe de tous les scripts, recherche sur le catalogue réel et régression des calculs or, bijoux argent, et des 18 pièces argent dans les deux modes. Le test automatisé de navigateur n’a pas pu démarrer dans l’environnement disponible : rendu Safari/iPhone et interactions visuelles à confirmer sur appareil. Les limites de récupération des sources décrites dans README.md restent applicables.

Le cache de l’application a été versionné. Après déploiement, fermer puis rouvrir l’application et actualiser si l’ancienne présentation apparaît encore.
