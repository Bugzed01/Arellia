# Arélia Maps 1.13 — Qualification des ruptures routières

*Référentiel : version 1.12 → inventaire 1.13, 4 novembre 2026. Travail non canonique.*

## Constat

Les **17 composantes** de la version 1.12 se décomposent en **10 réseaux urbains principaux** (un pour chacune des dix villes testées) et **sept fragments isolés**. Un fragment isolé ne représente pas nécessairement un pont manquant : ce peut être une voie locale, une rocade ou une radiale interrompue dans le dessin. Le moteur ne doit jamais conclure qu'un franchissement existe uniquement à partir de la proximité des lignes.

| Commune | Voie isolée | Point à inspecter XY | Écart minimal (unités XY) | Piste terrestre trouvée | Décision |
|---|---|---|---:|---|---|
| Occidian | occidian-locale-45 | 247.592 ; 762.242 | 0.115 | Oui | Non qualifiée |
| Occidian | occidian-locale-57 | 221.942 ; 770.666 | 0.852 | Non | Non qualifiée |
| Occidian | occidian-locale-58 | 211.887 ; 745.791 | 0.960 | Non | Non qualifiée |
| Estrel | estrel-locale-18 | 804.558 ; 751.949 | 0.945 | Non | Non qualifiée |
| Vésone | RMC-1 | 1110.000 ; 698.000 | 0.295 | Oui | Non qualifiée |
| Vésone | belrives-radiale-4 | 992.544 ; 670.129 | 0.169 | Oui | Non qualifiée |
| Vésone | belrives-radiale-5 | 1002.004 ; 670.355 | 0.082 | Oui | Non qualifiée |

Les coordonnées sont un **repère interne fictif XY**, sans précision géodésique réelle. Les distances minimales correspondent à des rapprochements géométriques testés, et non aux distances d'un futur tracé de route.

## Règle de qualification

Une rupture n'est levée que lorsqu'une connexion entre chaussées possède un contrat topologique clair : deux sommets communs ou une liaison documentée, la nature de l'ouvrage (intersection de plain-pied, pont, tunnel, passage supérieur), une géométrie entièrement validée par la frontière terre/eau, une provenance et une décision datée sur son statut canonique.

Une **piste terrestre** signifie uniquement que les sondes actuelles n'ont pas détecté d'obstacle géographique sur un segment candidat. Elle **ne prouve ni l'existence d'une route ni l'absence de contraintes de pente, de propriété, d'ingénierie ou de circulation**.

## Implémentation et reproduction

- `site/assets/arelia-road-gaps.js` : inventaire à la demande, analyse géométrique et classification non canonique.
- `src/maps/road_gaps_validate.cjs` : tests de déterminisme, de répartition des sept ruptures et d'absence de mutation du graphe.
- Interface : dans la carte d'une ville, sélectionner **Diagnostiquer le réseau routier**, puis ouvrir chaque rupture pour centrer l'atlas sur le segment problématique. Les marqueurs et segments éventuels constituent une **couche d'inspection**, jamais de navigation.
- Après modification du référentiel, si les coordonnées ou les nombres changent, régénérer et réviser ce document. Ne pas entériner une connexion automatiquement.

