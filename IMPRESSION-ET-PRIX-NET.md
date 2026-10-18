# Mise à jour du 18 octobre 2026

Remplacer les fichiers du dépôt GitHub par le contenu de ce ZIP, puis laisser Render redéployer le service existant.

- La proposition modifiable dans l’estimation est le prix net client, après taxes. Les FC / GtaX restent liés au prix avant taxes reconstitué ; la comparaison TMP / TPV garde le régime le plus avantageux.
- FC Net discret : bijoux or 91,01 % de la valeur intrinsèque au titrage ; pièces or boursables 98,5 % du cours ; lingots et lingotins boursables 98,8 % ; or à la fonte 94 %. Le prix avant taxes est soustrait de cette base.
- Imprimer ouvre la saisie facultative des coordonnées. Les informations internes sont proposées en option, décochée à chaque ouverture. Aucune coordonnée client n’est envoyée au serveur ni enregistrée dans le stockage du navigateur.
- Impression A4 avec marges de 15 mm, logo doublé, date et heure de Paris, validité de deux heures. Dix lignes avec FC ont été vérifiées dans Edge ; les lignes suivantes peuvent continuer sur une autre page. Les intitulés ou coordonnées exceptionnellement longs peuvent aussi ajouter une page.
- Pour imprimer : choisir A4, échelle 100 %, désactiver les en-têtes et pieds de page ajoutés par le navigateur. Vérifier l’aperçu avant impression ; le rendu iPhone dépend du dialogue AirPrint.
- Le logo est inclus dans `logo-cndo.png`. Il ne suit pas automatiquement les changements du site Gold.fr. Pour le changer, remplacer ce fichier dans GitHub puis redéployer. Si un appareil conserve l’ancien logo, fermer et rouvrir l’application ou actualiser la page.

Les totaux additionnent les montants de chaque ligne arrondis au centime.

Contrôles : dix suites de tests de calcul/interface simulée et parcours d’impression réel dans Edge avec dix lignes et informations internes visibles. Aucun test sur iPhone physique n’a été réalisé.

Présentation inspirée de la facture : taxes par ligne, récapitulatif par régime (base TPV après abattement), total FC Net de l’or dans l’application et à l’impression si option interne cochée.

Règle finale : les FC Net, par ligne et au total, restent uniquement à l’écran pendant la saisie. Aucun FC Net ne figure dans le document imprimé, même lorsque les pourcentages FC / GtaX sont cochés. Le total à l’écran reste sous « Net à verser au client ».
