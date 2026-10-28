# GoldApp mobile — palette PC et graphique intégré

Déposer le contenu du dossier dans le dépôt GitHub existant puis attendre la fin du déploiement Render. Garder server.py, kitco.py et bullionvault_history.py dans le même dossier.

- En-tête : montant Kitco EUR/kg et date/heure du cours en heure de Paris.
- Prix instantané et calculs : Bid Kitco directement reçu en EUR/kg, sans conversion locale.
- Graphique : données réelles BullionVault en EUR/kg, dessinées par GoldApp avec la palette PC. Périodes 1 jour, 7 jours, 1 mois et 1 an. Source indiquée sous la courbe ; le dernier point peut différer du Bid Kitco.
- Le graphique est revérifié toutes les 30 secondes quand il est ouvert, dans l’onglet Cours et avec l’application visible. Les calculs ne sont pas modifiés par les données du graphique.
- Icônes Cours et Rachat. Couleurs écran harmonisées avec le PC ; styles papier conservés.
- Les nouveaux caches sont distincts des anciens cours et historiques.

Fermer et rouvrir l’application mobile après le déploiement. Si nécessaire ouvrir une fois dans Safari et recharger pour récupérer le nouveau cache.
Cette archive ne modifie pas la suite Windows.
