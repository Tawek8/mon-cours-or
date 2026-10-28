# Réinitialiser et prix d’achat 18K

Le bouton Réinitialiser se trouve en bas de l’estimation client sur iPhone ET PC. Il efface toutes les lignes et recrée une ligne bijoux or 18K vierge, poids vide. Les détails fiscaux se replient. Les saisies du comparateur fiscal d’achat sont vidées, les FC du calcul d’achat redeviennent 8 %, et le calcul rapide 18K revient à la proposition automatique avec décote 25 %. Les cotations enregistrées restent disponibles.

Dans le cadre Prix d’achat 18K de la vue Cours iPhone, Prix proposé €/g et GtaX (%) sont maintenant modifiables :
- Référence = intrinsèque Gold.fr × 0,75 / 1000.
- Modification du prix : GtaX = 100 × (1 − prix / référence).
- Modification du GtaX : prix = référence × (1 − GtaX / 100).
- Modification de la décote dans les détails : retour à la règle automatique existante MIN(CPoR, intrinsèque) × 0,75 / 1000 × (1 − décote / 100).

Le champ GtaX accepte de 0 à 100 %. Un prix supérieur à la référence peut afficher un GtaX négatif, comme dans l’estimation. Les valeurs sont affichées avec deux décimales ; les calculs or gardent la précision existante. Une saisie vide ou un cours nécessaire absent affiche un résultat indisponible.

La présentation PC conserve son estimation pleine largeur et ses champs prix/GtaX par ligne. Le nouveau bouton Réinitialiser y est également visible.

Validation : tests des formules 18K dans les deux sens et du reset, régression or/argent, contrôle syntaxique des scripts. Le rendu sur Safari/iPhone reste à confirmer sur appareil comme pour la version précédente.
