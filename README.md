# Mon Cours de l’Or

Application web avec serveur Python standard, déployable depuis ce dépôt sur Render (configuration `render.yaml` incluse). Déposer le **contenu** de ce dossier à la racine du dépôt GitHub. Aucun module Python supplémentaire requis.

## Démarrage

Lancer `python server.py`, puis ouvrir http://localhost:8080. Sous Windows avec Python installé, utiliser `DEMARRER-WINDOWS.bat`. Le serveur est nécessaire aux cotations ; GitHub Pages seul ne suffit pas.

## Calculs de cette version

- Fonte : valeur intrinsèque publiée sur https://www.gold.fr/lingot-d-or-1-kg/, champ « Valeur intrinsèque », conservée sous la clé historique `instant` en €/kg. Aucun spot ni repli CPoR ne remplace une intrinsèque absente.
- Pièces à la fonte : intrinsèque / 1000 × poids d’or fin du catalogue, puis FC 12 % par défaut.
- Boursable : cotation du produit issue de la page Gold.fr des cours, FC 8 % par défaut. Les lignes non cotées sont exclues de cette extraction. Une cotation manquante reste indisponible.
- Bijoux : règle existante conservée, base = minimum du lingot CPoR et de l’intrinsèque Gold.fr. Puretés existantes : 375 / 585 / 750 / 900‰. Décotes respectives : 31 / 27 / 25 / 25 %. Poids initial vide. Le 22K reste à 900‰ conformément au catalogue source.
- GtaX = 100 × (1 − prix proposé / référence). Pour les bijoux, la référence est l’intrinsèque par gramme au titrage choisi ; pour les pièces, la référence dépend du mode. Un prix proposé modifié recalcule GtaX. Les taxes existantes restent calculées sur le prix proposé.
- Le spot et son graphique restent indicatifs sur iPhone et n’alimentent plus les calculs Fonte. La présentation iPhone est conservée. Sur PC : estimation pleine largeur, Actualiser en haut à droite, Ajouter une ligne après les lignes.

## Vérifications effectuées le 16 octobre 2026

Extraction exécutée sur le HTML réellement téléchargé des deux pages Gold.fr. Vérifications des quatre titrages, des décotes, de Boursable et Fonte, et de l’absence de substitution par un spot mémorisé. Contrôle syntaxique JavaScript réussi. Aucun test visuel sur iPhone physique effectué.

Les cours ne sont pas figés dans ce dépôt. Une erreur de récupération conserve les derniers cours enregistrés et affiche un message d’échec. Le site Gold.fr peut changer sa structure ; la lecture vérifiée aujourd’hui ne garantit pas les évolutions futures.

## Première intégration de l’argent

Encadré de consultation des 19 produits listés sur https://www.gold.fr/cours-argent-prix-de-l-argent/, actualisé avec le bouton Actualiser via /api/silver. Cache local distinct de l’or. Cotations suspendues ou absentes explicitement affichées. Aucune règle de rachat argent ajoutée à ce stade.

Les libellés et la disposition du tableau ont été examinés via la lecture web de Gold.fr. Le téléchargement direct du HTML était indisponible dans cet environnement ; le parseur argent a donc été testé sur des cas de tableau représentatifs, sans validation de bout en bout sur la source en direct. L’application signale une erreur si le tableau n’est pas reconnu et ne fabrique aucune cotation.
