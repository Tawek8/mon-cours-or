# Mise à jour mobile BullionVault

Déposer le contenu de ce dossier dans le dépôt GitHub existant puis attendre la fin du déploiement Render. Le module bullionvault.py doit être placé à côté de server.py.

Le spot et la référence intrinsèque or pur 1 kg viennent du flux BullionVault EUR/kg. Cache serveur 10 secondes ; aucune conversion USD/EUR. Contrôle du métal, de la devise, de la positivité et de la fraîcheur (120 secondes). Une source périmée provoque une erreur explicite et ne produit aucun nouveau prix inventé.

Le bouton Actualiser récupère les nouvelles valeurs. Les cours CPoR, les cours argent Gold.fr et le C3E restent distincts.

Le volet Graphique charge à son ouverture le graphique officiel BullionVault en EUR ; il est actualisé automatiquement par BullionVault. Son chargement nécessite Internet. Les prix du graphique évoluent indépendamment du dernier cours appliqué aux calculs de saisie.

Le cache de l’application mobile a été renouvelé. Après déploiement, fermer et rouvrir l’application depuis l’écran d’accueil ; si nécessaire ouvrir une fois dans Safari et recharger.

Cette archive concerne la version web/mobile Render et non la suite Windows.
