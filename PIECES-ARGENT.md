# Pièces argent : Fonte et Boursable

Dans l’estimation client sur PC, le menu produit comporte deux groupes argent : 7 références françaises et 11 modernes. Les boutons Fonte/Boursable fonctionnent comme pour les pièces en or.

Fonte : référence unitaire = C3E achat (€/kg) × poids d’argent fin (g) / 1000.
Boursable : référence unitaire = cours du produit publié par Gold.fr.
Prix proposé = référence × (1 − FC / 100), arrondi au centime avant multiplication par la quantité. FC initial : 34 % françaises, 20 % modernes, dans les deux modes. Le champ FC et le prix proposé restent modifiables. Un changement de mode rétablit les FC du groupe et la proposition automatique. GtaX = 100 × (1 − proposition / référence du mode choisi). Les taxes TMP/TPV existantes sont appliquées après la proposition.

Poids d’argent fin français vérifiés sur les fiches Gold.fr : Turin 10 F 6,8 g ; Turin 20 F 13,6 g ; Semeuse 5 F 10,02 g ; Hercule 5 F et 10 F 22,5 g ; Hercule 50 F 27 g ; 100 F 13,5 g.

Pour les modernes, le catalogue utilise le contenu nominal en argent fin : 1 once troy = 31,1034768 g pour les références « 1 Oz » ; 30 g pour le Panda 2025-26 ; 1000 g pour les deux références de 1 kg. Ne pas appliquer à nouveau le titre à un poids déjà exprimé en argent fin. Ces références n’incluent pas les anciens Panda d’une once ni les formats fractionnaires.

Sources :
- https://www.gold.fr/cours-argent-prix-de-l-argent/20-francs-turin/
- https://www.gold.fr/cours-argent-prix-de-l-argent/10-francs-turin/
- https://www.gold.fr/cours-argent-prix-de-l-argent/5-francs-semeuse/
- https://www.gold.fr/cours-argent-prix-de-l-argent/5-francs-hercule/
- https://www.gold.fr/cours-argent-prix-de-l-argent/10-francs-hercule/
- https://www.gold.fr/cours-argent-prix-de-l-argent/50-francs-hercule/
- https://www.gold.fr/cours-argent-prix-de-l-argent/100-francs-pantheon/
- https://www.mint.ca/en/shop/bullion-products/2021-1-ounce-9999-pure-silver-maple-leaf-bullion-coin
- https://www.perthmint.com/Australian-Koala-2025-1-Kilo-Silver-Bullion-Coin/
- https://www.perthmint.com/shop/collector-coins/coins/australian-kookaburra-2017-1kg-silver-proof-coin/
- https://www.usmint.gov/american-eagle-2024-one-ounce-silver-uncirculated-coin-24EG.html
- https://www.samint.co.za/2026-range/

Une cotation suspendue ne permet pas une proposition automatique Boursable. La Fonte reste calculable si le C3E est disponible. Les cours mémorisés conservent les limites de récupération décrites dans README.md : aucune validation serveur en direct de Cookson-Clal n’est revendiquée.

Vérification : tests des 18 références dans les deux modes, FC, quantités, prix manuel, arrondi, cotation suspendue et C3E manquant. Régression des calculs or et bijoux argent.
`nLes pièces argent sont sélectionnées en mode Fonte par défaut. Le mode Boursable reste accessible.
