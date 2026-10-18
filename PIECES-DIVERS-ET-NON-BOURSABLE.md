# Pièces Divers et impression

- « Pièce Divers Or » : poids brut par pièce en g, titrage en ‰ et quantité. Valeur de référence = valeur intrinsèque or Gold.fr en €/kg × poids par pièce × titrage / 1 000 / 1 000. FC par défaut 12 %, modifiables. FC Net calculé avec la base Non Boursable or à 94 %.
- « Pièce Divers Argent » : même saisie, source C3E achat en €/kg. FC par défaut 34 %, modifiables. Aucun FC Net argent n’est défini.
- Ces deux produits restent obligatoirement en Non Boursable. Leurs champs poids et titrage sont initialement vides ; le titrage doit être supérieur à 0 et inférieur ou égal à 1 000. Le poids doit être positif, la quantité entière et positive. Aucune cotation boursable n’est substituée à une source manquante.
- La proposition nette reste modifiable ; les FC suivent le montant avant taxes reconstitué. La comparaison TMP / TPV reste disponible.
- « Non Boursable » remplace « Fonte » dans les libellés affichés ; les formules correspondantes sont conservées.
- Le total FC Net est placé juste sous le net à verser, dans l’application et, si l’option interne est cochée, sur l’impression. Ce total concerne uniquement les produits or.
- Impression : document centré, marges A4 de 15 mm et mention de validité en bas. Vérification PDF : dix lignes mixtes (Or/Argent Divers, pièces et bijoux) avec FC sur une page ; vingt lignes sur deux pages. Parcours mobile testé avec une fenêtre de 390 px dans Edge, sans test sur iPhone physique.

Déploiement : remplacer les fichiers du dépôt par le contenu de ce ZIP et laisser Render redéployer. Le cache de l’application est versionné pour charger les nouveaux fichiers.

Règle finale : les FC Net, par ligne et au total, restent uniquement à l’écran pendant la saisie. Aucun FC Net ne figure dans le document imprimé, même lorsque les pourcentages FC / GtaX sont cochés. Le total à l’écran reste sous « Net à verser au client ».
