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
