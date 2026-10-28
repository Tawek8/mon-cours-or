# Lingot personnalisé et alertes de décote

## Lingot de 1 kg

Dans Estimation client, le produit « Lingot 1 kg » propose un poids par lingot en grammes et un titrage en ‰, initialement vides. La quantité représente le nombre de lingots de mêmes caractéristiques.

Référence par lingot = cours CPoR du lingot de 1 kg × poids en g / 1 000 × titrage en ‰ / 1 000.

Ce produit est obligatoirement boursable : aucun bouton Non Boursable, aucun recours à la valeur intrinsèque si CPoR manque. Le poids doit être positif et le titrage supérieur à 0 et inférieur ou égal à 1 000. Les champs incomplets restent exclus du total. Le prix net client et les FC restent modifiables dans les deux sens ; la fiscalité TMP / comparaison TPV est conservée. Les FC initiaux restent à 8 % et la base FC Net boursable à 98,8 % de la référence ajustée au poids et au titrage. Le poids et le titrage sont repris sur l’impression.

## Alertes

Les alertes visuelles ne bloquent ni la saisie ni l’impression. Elles restent visibles dans les lignes repliées sur mobile et ne sont pas imprimées.

- Bijoux en or et Or dentaire jaune : sous 18 %.
- Or Non Boursable, y compris pièces Divers Or et lingotins : sous 10 %.
- Lingotins boursables de 500 g ou moins : sous 4 % (500, 250, 100, 50, 20, 10 et 5 g).
- Aucun seuil propre au lingot de 1 kg boursable n’a été défini. Aucun nouveau seuil n’est appliqué à l’argent ou aux pièces or boursables.

Le pourcentage surveillé est calculé avant taxes : 100 × (1 − prix proposé avant taxes / référence). Une modification du prix net client est donc traduite en montant avant taxes avant de vérifier le seuil. Les valeurs exactement égales à 18 %, 10 % ou 4 % ne déclenchent pas l’alerte.

## Vérifications

Tests unitaires : seuils et limites exactes, prix net, références manquantes, dentaire, or Divers, lingotins et nouveau lingot. Tests navigateur sous Edge PC et en fenêtre mobile de 390 px : saisie, boursable imposé au lingot, poids/titre repris sur l’impression, seuil 4 % au lingotin 500 g et seuil NB 10 %, maintien de l’impression directe. Les suites précédentes passent aussi. Aucun test sur iPhone physique.

Cette archive inclut la fraîcheur des cours, l’impression directe avec le logo abaissé et l’Or dentaire jaune. Les FC Net restent exclusivement à l’écran.
