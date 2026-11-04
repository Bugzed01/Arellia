# Arélia — Portail impérial & encyclopédie

Site statique en français pour l'univers fictif de l'**Empire constitutionnel d'Arélia**.

## Ce qui est inclus

- Portail institutionnel responsive (accueil, institutions, territoires, chroniques) ;
- Arélia Maps : carte indépendante zoomable et déplaçable, modes Plan / Relief / Nuit, recherche, filtres, calques, fleuves, routes et voies ferrées, calcul d’itinéraires indicatifs ;
- Wiki avec **18 articles**, recherche instantanée, filtres thématiques, articles liés et sommaires ;
- Contenus identifiant les informations **établies** et celles **en conception** ;
- Déploiement automatique via **GitHub Pages / GitHub Actions**, sans serveur ni base de données ;
- Référentiel canonique JSON et code source du générateur ;
- Les illustrations de la conversation servent de visuels **conceptuels**, pas de cartes métriques.

## Démarrage local

Ouvrir `site/index.html` directement dans un navigateur ou lancer un serveur local :

```bash
python3 -m http.server 8000 --directory site
```

Ouvrir ensuite http://localhost:8000/ . Les fichiers générés sont déjà inclus : aucune compilation n'est nécessaire pour consulter le site.

## Publication sur GitHub Pages

1. Créer un **nouveau dépôt GitHub** (par exemple `arelia`), de préférence public si vous utilisez GitHub Pages avec un compte gratuit.
2. Ajouter **tout le contenu de ce dossier** à la racine du dépôt : `site/`, `src/`, `.github/` et `README.md`.
3. Vérifier que la branche principale s'appelle `main` (ou adapter `.github/workflows/pages.yml`).
4. Dans le dépôt, ouvrir **Settings > Pages**, puis sous **Build and deployment**, sélectionner **GitHub Actions**.
5. Ouvrir l'onglet **Actions** et vérifier que le workflow **Publier le portail d’Arélia** s'achève sans erreur.
6. GitHub affiche alors l'URL du site, habituellement `https://<utilisateur>.github.io/arelia/`.

La publication fonctionne dans un sous-répertoire GitHub Pages grâce aux liens relatifs calculés à la génération. Le workflow reconstruit automatiquement les pages avant le déploiement.

### Modifier un article

Les contenus sont rassemblés dans `src/content.py`. Après modification :

```bash
python3 src/build.py
```

Ajouter les fichiers mis à jour du dossier `site/` au commit pour disposer aussi d’une copie consultable hors ligne. GitHub Actions relance automatiquement le générateur lors du déploiement : une édition de `src/content.py` faite directement sur GitHub peut donc également être publiée sans génération locale.

### Ajouter un article

Ajouter une entrée structurée dans `ARTICLES`, dans `src/content.py`. Le générateur créera automatiquement une fiche et la référencera dans le Wiki. Ajouter au besoin des liens `related` vers d'autres articles existants.

### Faire évoluer Arélia Maps

La page `site/atlas/` contient **Arélia Maps v0.3**, construite sur un plan de coordonnées propre à l'univers. Le fond cartographique a été créé spécialement pour cette version et n'utilise aucune carte réelle ni aucun service Google.

- `site/assets/arelia-map-data.json` : référentiel géographique avec villes, lieux naturels, routes, voies ferrées, fleuves, canaux de Vésone, littoral et coordonnées. Ces coordonnées sont **fictives**, elles ne correspondent pas à des latitudes et longitudes terrestres.
- `site/assets/arelia-terrain.webp` et `arelia-plan.webp` : fonds de cartes pré-générés (mode Nuit calculé dans le navigateur).
- `site/assets/arelia-maps.js` et `arelia-maps.css` : application interactive autonome, sans API payante ni dépendance réseau.
- `src/maps/atlas_markup.py` : source HTML de la page. Le script `src/build.py` la régénère à chaque publication ; ne pas modifier seulement le HTML généré.
- `src/maps/validate.py` : vérification du référentiel, intégrée à GitHub Actions.
- `src/maps/generate.py` : génération *optionnelle* des fonds et données géographiques. Requiert `numpy`, `Pillow`, `scipy` et `shapely` sur un poste de travail. **Ne pas lancer** ce générateur par défaut : une nouvelle exécution recrée les paysages et écrase la version géographique en vigueur.

Pour valider avant publication :

```bash
python3 src/build.py
python3 src/maps/validate.py
```

La superficie continentale est normalisée à **1 000 000 km²**. C'est une convention de l'atlas, pas un relevé topographique. Les routes et la grille de rues de Vésone sont des **propositions de géographie fictive** ; les itinéraires calculés sont approximatifs et ne fournissent ni durée, ni trafic, ni navigation routière réelle.

Pour une vraie carte de niveau urbain, la prochaine étape consiste à découper le monde en tuiles vectorielles et à détailler les réseaux de voirie par secteurs. Les données actuelles ne constituent ni une heightmap jouable ni une base SIG cadastrale et ne peuvent pas être directement importées comme terrain Unreal Engine.

## Données de référence

| Champ | Valeur |
|---|---|
| Pays | Empire d'Arélia |
| Population | 100 000 000 |
| Superficie | 1 000 000 km² |
| Capitale | Vésone |
| Forme politique | Empire constitutionnel |

Ces données peuvent aussi être lues dans `site/assets/referentiel.json` pour d'autres usages (atlas évolué, Unreal Engine, etc.).

## Limitations de cette première version

- Wiki consultable, **pas de modification collaborative directe** ni comptes utilisateurs ; contributions possibles via GitHub.
- Atlas local interactif, **pas de système GIS** officiel ni de coordonnées terrestres réelles.
- Les textes institutionnels non décidés sont explicitement marqués comme « en conception ».
- Il n'y a pas de site public publié automatiquement par l'archive ZIP : la mise en ligne nécessite votre propre dépôt GitHub.

## Technologies

HTML5 Canvas, CSS3, JavaScript natif, Python standard pour la génération du portail (le générateur de terrain est séparé et facultatif). Pas de dépendances npm, pas de backend. La première version privilégie une publication directe sur GitHub Pages plutôt qu'un framework nécessitant une chaîne de compilation.

## Crédits

Visuels originaux d'Arélia générés au cours de cette conversation ; contenus de fiction. Ne pas présenter le portail comme une vraie autorité publique.

## Vésone — plan organique v0.3

La trame orthogonale initiale a été remplacée par 253 îlots irréguliers, 727 empreintes de bâtiments, 13 voies structurantes courbes, 7 canaux et 25 ponts alignés sur les croisements. Le générateur Python (`src/maps/vesone.py`) est déterministe ; il régénère `site/assets/vesone-city.json` à chaque publication. L'ensemble constitue une **fiction cartographique provisoire**, et non un cadastre ou une navigation métrique précise.

### Vésone 0.4 — rues et quais organiques

Le générateur Python définit désormais des îlots irréguliers, des parcelles alignées sur les axes proches, des ruelles, cinq places, des quais sur les deux rives des canaux, des arbres d'alignement et des empreintes de monuments. Ces détails sont **provisoires et fictifs** ; ils ne sont pas cadastraux. `python3 src/build.py` reconstruit le fichier généré `site/assets/vesone-city.json` lors du déploiement.

## Vésone 0.5 — secteurs métropolitains (provisoires)

Sept secteurs fonctionnels, quatre lignes de transport illustratives, dix stations et deux rocades complètent le plan organique. Des calques permettent de distinguer les fonctions des quartiers et le métro, tram et rail urbain. Les tracés, bâtiments et noms sont des hypothèses de worldbuilding et non des infrastructures définitives. L'inventaire couvre seulement la zone pilote de Vésone ; il ne constitue pas une modélisation complète de la métropole.

## Grand Vésone 0.6

La vue `/atlas/?vue=metropole` introduit sept pôles urbains satellites, 175 petites zones bâties schématiques, 9 axes métropolitains et quatre lignes ferroviaires express. Les données versionnées se trouvent dans `src/maps/metro_overlay.json`, appliqué au générateur de Vésone lors de la construction du site. Les routes et les formes urbaines restent des propositions fictives, sans temps de parcours réel.

## Version 0.7 — continuité du Grand Vésone

Les sept routes radiales sont ancrées sur des sommets de voies du centre ; les huit gares régionales correspondent à des points exacts des quatre lignes RER fictives. Sept villes satellites possèdent des rues locales et 331 parcelles suburbaines schématiques. Le rendu montre les gares, les voies locales et les zones d'activités au niveau de zoom pertinent. Tous les tracés restent provisoires.

## Arélia Maps 0.8 — itinéraires réellement calculés sur le schéma

La vue `/atlas/?vue=metropole` permet de choisir un départ et une arrivée parmi les sept villes satellites et un accès à Vésone, puis de calculer un trajet en **route** ou en **train express**.

- Le moteur autonome `site/assets/arelia-routing.js` découpe les corridors routiers à leurs intersections et effectue une recherche de plus court chemin par longueur géométrique.
- Les parcours ferroviaires sont calculés sur les quatre lignes fictives, avec correspondance possible au pôle central.
- Les trajets sont des **schémas indicatifs**, pas une navigation Google Maps : pas de feux, vitesses, circulation, sens uniques, rues de quartier ni horaires. Les kilomètres dérivent de la convention d'échelle de l'atlas.
- Les tests `src/maps/route_validate.cjs` vérifient les 56 couples orientés de lieux distincts en route et en train, et l'intégration est contrôlée à chaque publication GitHub Pages.
- Le trajet vers « Vésone » aboutit à un **accès du centre urbain**, pas à l'implantation exacte d'un monument. La modélisation du relief hydrologique et des risques d'inondation reste à faire : aucune carte de risques n'est inférée de ces données.

## Arélia Maps 0.9 — relief métropolitain et hydrographie

Dans la vue **Métropole**, le mode **Relief** affiche des courbes topographiques fictives, issues d’une grille de 43 × 35 valeurs d'**indice relatif (0 à 100), et non d’altitudes en mètres**. Les couches « Courbes de relief local » et « Terrains bas (illustratifs) » peuvent être activées indépendamment ; un indicateur donne l’indice de terrain sous le curseur.

- Cinq cours d’eau complémentaires sont raccordés au réseau de canaux existant, avec des points de jonction explicitement enregistrés.
- Neuf franchissements sont localisés géométriquement aux intersections des axes routiers et de ces cours d’eau.
- La géographie source est versionnée dans `src/maps/metro_overlay.json`, le portail étant reconstruit via `src/maps/vesone.py`.
- Les contrôles automatiques vérifient les 1 505 valeurs du modèle, les connexions hydrologiques et les positions de chaque franchissement.

**Limite essentielle :** ni l’indice de relief ni les secteurs bas ne représentent de vraies altitudes, des niveaux d’eau, des débits ou une exposition aux crues. Ce n’est pas une carte de risque d’inondation. Les axes routiers et les ponts restent des propositions non canoniques.

## Arélia Maps 1.0 — cohérence et ergonomie

Version jalon du portail statique, sans données géographiques réelles :
- Le générateur exclut les 64 bâtiments qui chevauchaient les emprises des canaux : 629 bâtiments restent dessinés.
- Le centre, les îlots bâtis et les ruelles apparaissent progressivement avec le zoom plutôt que par paliers brutaux.
- Les étiquettes se hiérarchisent selon le type de lieu et disparaissent lorsqu'elles se recouvrent (les repères cliquables restent visibles).
- La carte accepte le glissement à un doigt, le zoom et le déplacement à deux doigts, la molette, le clavier et les boutons de zoom.
- Un repère d'échelle géographique (Empire, Agglomération, Quartiers, Rues) et une barre métrique actualisée accompagnent la navigation.
- Les fiches peuvent être fermées sur téléphone ; les contrôles restent séparés des interactions sur la carte.
- Les règles de caméra et d'affichage font l'objet de tests Node indépendants et le générateur Python contrôle la géométrie des canaux.

Il s'agit d'une **version 1.0 de l'atlas expérimental**, pas d'un cadastre complet ni d'une alternative de précision comparable à Google Maps.

## Arélia Maps 1.1 — Occidian, Orientale et Estrel

La carte propose désormais un sélecteur **Autres villes**, ainsi que les URLs `/atlas/?vue=occidian`, `?vue=orientale` et `?vue=estrel`. Chaque plan comporte un tissu bâti vectoriel, 14 grands axes courbes, 62 voies locales, sept jardins, deux cours d'eau / canaux et six lieux proposés. Le modèle de source est `src/maps/other_cities.json`, copié automatiquement par `src/build.py` au site publié. Les quartiers sont des **propositions fictionnelles non canoniques** et ne prétendent pas représenter précisément le million de km² de l'île à l'échelle des rues. Vésone et ses itinéraires existants restent indépendants.

Les trois plans apparaissent également en zoomant depuis l'atlas national ; le sélecteur permet de se recentrer immédiatement sur une ville. Les notices du wiki d'Occidian, d'Orientale et d'Estrel renvoient vers le plan correspondant.

## Arélia Maps 1.2 — Couverture nationale générative

`site/assets/arelia-world.js` produit, sans API externe, des milieux naturels irréguliers, des courbes de relief indicatives, un réseau routier régional, des affluents secondaires, des dessertes de villages et des plans locaux déterministes sur toute l'île.
La génération est **stable** avec le seed `20261103`, ne s'exécute qu'au chargement de l'atlas et reste indépendante des données canoniques déjà établies.

Les nouvelles communes apparaissent en zoomant sur le territoire et sont recherchables via le filtre **Localités**. Six autres villes importantes reçoivent un plan urbain différencié : Katoru, Namiya, Valmère, Azuré, Tessal et Drél. Toutes les implantations et tous les toponymes supplémentaires ont le statut **provisoire / non canonique**.

Le moteur dessine les détails selon le zoom et la portion visible du territoire, sans service cartographique tiers. Les campagnes et les régions naturelles ont leurs propres dessins à fort zoom. Les nouveaux chemins ne sont pas encore intégrés au calcul d'itinéraire : aucune durée de déplacement ou connexion physique réelle n'est garantie.

À très fort zoom, le moteur produit à la demande des **cellules rurales de 24 unités** (cultures, sentiers, bois, détails rocheux, courbes de relief et petites constructions). Les chemins aux bordures de cellules sont raccordés par une règle de génération commune. La mise en cache évite de recalculer les cellules déjà consultées. Le plafond de zoom a été étendu pour inspecter les détails locaux. Toutes ces figures sont schématiques : elles ne constituent pas une carte cadastrale ou touristique précise.

### Focus : l'estuaire d'Occidian
Le port reçoit trois bassins, trois secteurs logistiques, des quais, des embranchements routiers et ferroviaires, des entrepôts, des ponts placés sur des croisements calculés avec les voies d'eau et huit lieux supplémentaires à découvrir. Les bâtiments proches des bassins et des zones logistiques ont été filtrés lors de cette édition.
**Tous les tracés, ouvrages et toponymes ajoutés sont provisoires ; ils ne constituent pas un port navigable simulé.**

Les plans urbains sont densifiés à très fort zoom par un second niveau de cellules de 8 unités. Les bâtiments complémentaires sont créés à la demande, mémorisés et orientés selon les voies proches, avec exclusions autour des cours d'eau, parcs et empreintes existantes. Les bâtiments ne sont pas ajoutés de façon permanente aux fichiers canoniques : ils restent des propositions purement cartographiques.

## Arélia Maps 1.3 — itinéraires nationaux topologiques

Les itinéraires de l'atlas national ne sont plus des courbes inventées entre villes. Le moteur autonome `site/assets/arelia-national-routing.js` découpe les axes nationaux, régionaux et les dessertes rurales à leurs intersections ; une recherche de plus court chemin calcule ensuite des points **le long des voies représentées**.

Les 790 localités peuvent être sélectionnées dans les menus « Départ » et « Arrivée », en complément des grandes villes. Les noms sont triés par ordre alphabétique et les lieux regroupés dans deux familles. Un chemin est dessiné avec sa distance géométrique approximative, sans durée de voyage.

Les contrôles vérifient la reproductibilité du graphe, la connectivité entre les grands centres et l'accès routier à chacune des localités. Les franchissements routiers ne sont pas encore qualifiés : lorsqu'un axe en croise un autre, le prototype suppose une intersection praticable. Ce n'est **pas une carte routière certifiée ni un outil de navigation réelle**.

## Arélia Maps 1.4 — audit des infrastructures

Le graphe national ne connecte plus les routes dont les segments se croisent sans sommet d'accès déclaré. Les croisements inconnus restent séparés : un pont, un tunnel ou un échangeur ne sont pas supposés exister parce que deux lignes se croisent sur le plan.

Un diagnostic des voies d'eau, de la côte et du lac Orélys répertorie les franchissements candidats et les portions de tracés problématiques. Le bouton **Ouvrages ?** et le calque **Franchissements et tracés à vérifier** permettent d'explorer ces informations. L'indication sur un itinéraire est une détection géométrique et non une validation d'ouvrage.

Les contrôles sont reproductibles via `src/maps/national_route_validate.cjs` et `src/maps/geo_audit_validate.cjs`. Aucun point de franchissement n'est réputé réel, praticable ou canonique sans vérification ultérieure.

Le panneau d'audit propose également une **liste de points à examiner** (lac, côte et ouvrages potentiels), classés par type : sélectionner une ligne recentre directement la carte sur les coordonnées du problème. Les tests de démarrage simulent l'ouverture du panneau et le recentrage sur une anomalie.

## Arélia Maps 1.5 — voies terrestres corrigées

La route nationale **A5** contourne désormais le nord du **lac Orélys**. Le tracé est défini dans `src/maps/generate.py` et synchronisé dans `site/assets/arelia-map-data.json`, ce qui rend la reconstruction de la carte cohérente.

Le générateur `site/assets/arelia-world.js` conserve les voies déjà terrestres et applique un **contournement déterministe** en cas de traversée d'un lac ou d'une portion maritime. Il utilise une recherche sur un maillage terrestre et simplifie ensuite le parcours sans couper les surfaces d'eau. Le dernier contrôle a corrigé **une liaison régionale et 104 dessertes rurales**, sans détour non résolu. Les 790 localités restent reliées par le réseau représenté.

Les validations `src/maps/world_validate.cjs` et `src/maps/geo_audit_validate.cjs` vérifient désormais chaque ligne terrestre et interdisent les régressions détectées sur le lac ou hors terre. L'audit géométrique n'a trouvé **aucune portion sur le lac ni hors terre** après correction. Il reste **350 croisements routiers** et **quatre ferroviaires** avec des cours d'eau à qualifier, sans que cela implique nécessairement autant de ponts.

La commande **Ouvrages ?** affiche le nombre de détours réalisés et une file de vérification paginée (16 éléments par page), avec recentrage sur les coordonnées des croisements.

**Limites :** les lignes sont fictives et non cadastrales. Un tracé terrestre valide n'établit pas un accès public, un franchissement constructible, un gabarit de route, une vitesse de circulation ni un ouvrage existant. Les croisements de fleuves restent des points non qualifiés.

## Arélia Maps 1.6 — mesurer et lire le terrain

Le bouton **↔ Mesurer** permet d'ajouter des points en cliquant sur la carte, tout en conservant le déplacement par glissement, le zoom, l'annulation et l'effacement. La distance cumulée est affichée en kilomètres dans le référentiel XY synthétique normalisé, avec une indication de franchissement éventuel de l'eau. Il s'agit de segments à vol d'oiseau, **pas d'un itinéraire routier** ni d'une distance terrestre réelle.

Le survol montre la position XY, le biome et un indice de relief fictif sur 100, **pas une altitude en mètres**. Les détails du relief métropolitain restent distincts. Code et tests : `site/assets/arelia-measure.js`, `src/maps/measure_validate.cjs`, `src/maps/viewer_smoke.cjs`.

## Arélia Maps 1.7 — atlas à la lisibilité d'une carte de jeu

Cette passe ajoute un style **Atlas** par défaut, inspiré de la clarté cartographique d'un jeu de monde ouvert comme GTA V (sans utiliser ses actifs, contours ou données). Le mode original **Plan** reste accessible. Le littoral est souligné, le relief se lit en courbes, les routes et localités apparaissent plus tôt à l'écran.

Le nouveau moteur `site/assets/arelia-detail.js` génère des couches locales continues : prairies, parcelles, bosquets, pistes, petits chemins, hameaux, fermes, vergers, mares et végétation des zones arides. L'atlas ne charge que les cellules visibles, garde un cache plafonné et produit des détails déterministes. Le bâti des villages et plusieurs plans urbains ont été densifiés. Les tracés routiers ajoutés par ce calque sont **visuels et non navigables** ; les itinéraires continuent de s'appuyer sur leur propre graphe validé.

La géographie établie de l'île (1 000 000 km², 100 millions d'habitants, Empire constitutionnel, capitale Vésone) reste inchangée. Les micro-détails générés sont des propositions de worldbuilding et ne constituent ni carte cadastrale ni topographie réelle.

## Arélia Maps 1.8 — topologie locale et réalisme territorial

Le générateur rural classe les tuiles suivant leur **proximité aux routes et localités**, leur biome et la pente. La densité bâtie n'est plus uniformément distribuée dans le désert, les montagnes et les campagnes. Les maisons suivent des chemins, les chemins secondaires partent de sommets existants et certains se raccordent graphiquement aux axes nationaux. Ces détails restent **illustratifs et ne participent pas au graphe d'itinéraires**.

Dans les villages, les rues partagent maintenant des carrefours identiques et les bâtiments sont générés en parcelles orientées selon la voirie, avec rejet des maisons sur l'eau. Les parcelles agricoles présentent une orientation cohérente, les rives des cours d'eau bénéficient d'une végétation spécifique et les versants rocheux de hachures.

Le rendu Atlas et Relief peut ajouter une ombre topographique locale calculée depuis l'indice de hauteur (non métrique), sans API ni téléchargement de tuiles. Le calque *Ombres du relief* peut être désactivé. Les noms des villages apparaissent progressivement avec contrôle des collisions. Toutes les géométries restent fictives, reproductibles et provisoires.

Les six plans urbains procéduraux créés par le moteur national utilisent désormais des **avenues depuis un carrefour central**, des rues secondaires attachées à celles-ci, des rocades interrompues lorsque la côte le demande, et des bâtiments rapprochés des rues. Les empreintes urbaines sont rejetées lorsqu'elles tomberaient sur l'eau. Les trois plans historiques précalculés conservent leur structure et demandent une passe de transformation distincte.

## Arélia Maps 1.9 — continuité paysagère et performances

La grande passe 1.9 ajoute un **index spatial indépendant** (`site/assets/arelia-spatial.js`) des 790 localités, des routes et de l'hydrographie. Les tuiles locales interrogent cet index au lieu de reparcourir tous les tracés de l'île à chaque zoom. Les résultats sont déterministes ; le cache des détails est isolé par monde afin d'éviter des collisions entre jeux de données.

Le rendu Atlas comporte désormais une **ombre topographique nationale** (visible dès la vue d'ensemble), en plus des textures locales d'ombrage à résolution réduite. Le tracé des côtes bénéficie d'une bande sableuse côté terre, les champs ont des haies ou des murets orientés par les parcelles, les cinq grands axes routiers sont plus distincts et reçoivent leurs numéros A1–A5. Les contrôles de zoom, de couches, de recherche et les itinéraires existants sont conservés.

Les détails ne doivent pas être pris pour des données cadastrales ni pour un graphe routier complet : les pistes locales sont toujours illustratives. La surface, la population et les institutions de l'île restent inchangées.

## Arélia Maps 1.10 — lacs, vallées et sites naturels

La génération des affluents est désormais contrainte par la géographie terrestre du référentiel : **les segments qui traverseraient une surface d'eau sont écartés**, notamment autour du lac d'Orélys. Chaque affluent débouche sur un sommet attesté de son fleuve de rattachement. Les rives sont davantage lisibles grâce à une bande de vallée végétale, affichée selon le zoom.

**75 sites naturels provisoires** ont été ajoutés, classés en cinq familles (15 belvédères, 15 reliefs montagneux, 15 clairières, 15 dunes et 15 vallons). Leur position est calculée selon le relief, la couverture des sols et l'éloignement des grandes villes ; ils sont accessibles via la recherche et le filtre Nature. Ils ne représentent pas des lieux canoniques de l'univers et ne modifient ni la superficie, ni la population, ni l'organisation institutionnelle d'Arélia.

## Arélia Maps 1.11 — routage porte-à-porte, villes et réseau national

Les rues des **790 localités** utilisent désormais des intersections à sommets strictement partagés avec la rue principale. Le nouveau module **`arelia-urban-routing.js`** construit à la demande le graphe routier d'un quartier, d'une ville ou d'un bourg sans charger toutes les rues du pays en une fois.

Le moteur assemble une portion urbaine de départ, les voies du graphe interurbain, et la portion urbaine d'arrivée. Les sélecteurs de départ et de destination couvrent les grandes villes, les localités, les quartiers, gares et monuments figurant dans les dix plans urbains. Le plan de Vésone rassemble aussi les axes de sa région métropolitaine et ses villes satellites. Les routes passant à travers un croisement non qualifié ne sont **pas** connectées automatiquement. Les courtes voies de raccordement générées sont des **propositions** contrôlées contre les côtes et les canaux ; elles peuvent être révélées dans le calque « Voir les raccordements provisoires ».

La distance indiquée ne compte que les lignes du graphe représenté. Les distances entre un lieu et sa voie la plus proche figurent en traits pointillés et sont **exclues** du total routier. Certaines composantes restent déconnectées si aucun passage terrestre ou ouvrage qualifié ne peut être établi ; aucune garantie de franchissement, de circulation ou de temps de trajet. Le code est testé automatiquement dans `src/maps/urban_route_validate.cjs` (790 villages, les dix villes, accessibilité de leurs points d'intérêt et itinéraires interéchelles).

Cette cartographie reste une proposition fictive, pas une navigation réelle ; elle conserve la population (100 millions), la superficie (1 million km²) et le régime d'Empire constitutionnel de l'univers.

## Arélia Maps 1.12 — continuité contrôlée du réseau routier

Le routage des dix villes utilise une **topologie de référence par sommets communs**, suivie d’une **sélection minimale de raccordements terrestres proposés**. Les candidats sont uniquement retenus lorsqu'ils relient deux composantes précédemment séparées. Les segments traversant l’eau, quittant les limites urbaines ou longeant une rue jusqu'à un croisement non attesté sont rejetés. Aucun carrefour, pont ou échangeur n’est présumé sur la seule base d’un croisement graphique.

Sur le référentiel de cette passe, le diagnostic dénombre **17 composantes encore distinctes** et **341 raccordements proposés**, contre **68 composantes et 1 279 raccordements proposés** en version 1.11. Les nouveaux segments restent **non canoniques**. Ils sont tracés **en pointillés violets**, avec leur longueur explicitement isolée dans le résultat d'itinéraire ; les accès hors voie restent en pointillés orangés/rouges, et ne sont pas comptés dans la distance routière.

Le bouton « Diagnostiquer le réseau routier » de chaque ville révèle le nombre de composantes avant/après, les liaisons proposées et les candidatures rejetées. Les tests `urban_route_validate.cjs` contrôlent aussi l'absence d'échangeur implicite, la conservation des intersections en T réellement définies, le refus de traverser un canal et les métadonnées des distances provisoires. **Toutes les rues ne sont pas pour autant raccordées**, ni tous les ouvrages qualifiés : les 17 dernières composantes requièrent des décisions cartographiques explicites.

## Arélia Maps 1.13 — examen géographique des sept ruptures

Le nouveau module `site/assets/arelia-road-gaps.js` identifie les **7 fragments isolés** encore présents dans les **17 composantes des 10 villes**. Les lacunes se situent à **Occidian (3)**, **Estrel (1)** et **Vésone (3)**. Les six autres villes ont chacune une seule composante dans le graphe contenant les voies proposées, ce qui ne signifie pas que ces voies soient qualifiées. Le module n'ajoute **aucune liaison** et ne transforme aucun croisement dessiné en carrefour.

Dans chaque plan urbain, **Diagnostiquer le réseau routier** affiche maintenant les fragments, leurs voies d'origine, leur écart minimal aux routes du réseau principal et une classification prudente : piste terrestre non attestée, ou obstacle géométrique à étudier. Un bouton par rupture recentre la carte au niveau du problème. Le calque **Ruptures de voirie à examiner** indique les emplacements avec des repères numérotés, distincts des routes et des raccordements proposés. Les traits éventuels ne sont que des propositions d'inspection et ne sont pas navigables.

Le registre `docs/qualification-reseau-1.13.md` documente les sept cas concrets et la procédure de qualification d'un ouvrage. Les tests `src/maps/road_gaps_validate.cjs` vérifient les 10 villes, la distribution des ruptures, le caractère reproductible du diagnostic et l'absence de modification du graphe. Aucune assertion de route, pont ou tunnel existant n'est déduite de la seule géométrie.

## Arélia Maps 1.14 — voirie haute définition et qualification des accès

Une nouvelle couche de dessin, `site/assets/arelia-road-detail.js`, introduit une **hiérarchie de chaussées** (rocades et voies express, boulevards et avenues, rues et ruelles) avec accotements, voies centrales et ponts détaillés. Ce calque est utilisé dans les plans régionaux comme dans Vésone, en mode Atlas et Nuit. Les ouvrages affichés proviennent de la liste existante de ponts proposés ; aucun nouveau franchissement n'est inventé.

Le calque **Carrefours explicitement connectés** ne dessine des pastilles de jonction qu'aux sommets routiers effectivement partagés par au moins deux voies du graphe et trois branches. Il refuse les simples croisements graphiques et exclut les raccordements provisoires de la preuve de carrefour. Un axe visuellement croisé n'est donc pas automatiquement navigable.

Chaque **accès hors réseau** est maintenant sondé contre les canaux, le littoral et les limites urbaines. Si la géométrie est bloquée, il reste visible mais apparaît en pointillés rouge vif, avec avertissement distinct du tracé routier. Un accès sans obstacle détecté reste néanmoins **non attesté** : ni largeur, ni réglementation, ni pont, ni trafic réel n'est déduit du modèle. La distance du trajet routier exclut toujours les accès hors réseau et distingue la longueur des raccordements proposés.

La suite `src/maps/road_detail_validate.cjs` vérifie les trois catégories de dessins, la géométrie des ponts déclarés, la distinction entre croisement non relié et carrefour en T, et l'existence de contrôles d'accès sur les dix villes. Les invariants d'Arélia (1 million de km², 100 millions d'habitants, Empire constitutionnel) ne changent pas.

## Arélia Maps 1.15 — grande passe de densification visuelle des villes

Cette version ajoute une **couche architecturale procédurale**, écrite sans service externe dans `site/assets/arelia-urban-scene.js`, aux **dix plans urbains** d'Arélia. Les données de voirie et de bâtiments existantes restent le point de départ : les objets nouveaux se placent par rapport aux avenues, parcs et cours d'eau **sans ajouter des routes navigables ni inventer des bâtiments canoniques**.

Sur la graine actuelle du dépôt, le moteur produit **1 608 parcelles urbaines**, **2 835 arbres de voirie**, **345 aires de stationnement**, **63 équipements sportifs** dans les parcs existants et **trois cours portuaires illustrées** dans le plan d'Occidian. Les 4 078 bâtiments préexistants reçoivent au zoom des ombres projetées, des arêtes et des toitures détaillées, tout comme les bâtiments complémentaires générés à la demande par les tuiles urbaines. Des matériaux distincts sont utilisés selon les contextes de Vésone, du nord, du littoral et du sud aride.

Les éléments sont affichés automatiquement en zoomant : parcelles dès le zoom intermédiaire, parkings au zoom urbain, arbres de rue et terrains de sport au zoom rapproché, détails des toitures et voitures à plus fort grossissement. Les zones maritimes, les canaux et les limites urbaines sont pris en compte ; la composition est **déterministe**, testée contre les eaux et mise en cache par plan. L'atlas reste **une carte fictive 2D**, et non un rendu 3D satellitaire de qualité GTA V. Le statut des bâtiments et infrastructures ajoutés reste **proposition non canonique**.

La version synchronise également le plan public `site/assets/arelia-other-cities.json` avec le fichier source `src/maps/other_cities.json`, qui comprend les détails du port d'Occidian. Les tests `urban_scene_validate.cjs` vérifient la densité minimale, la reproductibilité, la géométrie terrestre, les équipements et l'API Canvas. Les routes et diagnostics de 1.14 ne sont pas modifiés.

En complément de la passe 1.15, l'ouverture d'une ville régionale se place désormais directement au **zoom ×18**, afin de montrer les parcelles, stationnements et arbres sans imposer un zoom manuel supplémentaire. Les mêmes vues restent déplaçables et dézoomables.
