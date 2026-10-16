# Prix proposé et FC liés — or et argent

Dans l’estimation client sur PC et iPhone, les pièces or et argent (et les lingots or) disposent désormais de champs Prix proposé / unité et FC % liés dans les deux sens, dès la saisie :

- Modification du prix : FC = 100 × (1 − prix proposé / référence du mode choisi).
- Modification de FC : retour au calcul automatique du prix = référence × (1 − FC / 100).
- Fonte or : référence intrinsèque Gold.fr ; Fonte argent : référence calculée sur C3E achat et poids fin.
- Boursable or : CPoR du produit ; Boursable argent : cours Gold.fr du produit.

Un prix manuel reste conservé si les cours changent ; le FC affiché s’adapte alors à la nouvelle référence. Sans référence disponible, aucun FC n’est inventé. Les arrondis argent au centime sont conservés. Un prix supérieur à la référence donne un FC négatif. Un changement de produit ou de mode rétablit les FC par défaut existants.

Vérifications : les 15 pièces or et 18 pièces argent dans les deux modes (66 cas), saisie dans les deux sens, prix au-dessus de la référence, montants vides ; régression des suites d’audit existantes.
