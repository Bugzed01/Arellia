# Arélia — Portail impérial & encyclopédie

Site statique en français pour l'univers fictif de l'**Empire constitutionnel d'Arélia**.

## Ce qui est inclus

- Portail institutionnel responsive (accueil, institutions, territoires, chroniques) ;
- Atlas interactif (points de carte, fiches de lieux, zoom et déplacement) ;
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

### Mettre à jour la carte

- Changer l'illustration `site/assets/arelia-atlas.webp`.
- Modifier les positions des boutons dans `src/build.py` (`markers`, valeurs en pourcentage).
- Adapter les données de lieux dans `site/assets/site.js` (`details`).

**Attention :** l'image initiale porte des noms et des chiffres issus de versions précédentes de la création ; seule la fiche canonique du site et `site/assets/referentiel.json` fixent les chiffres courants. Pour une carte géoréférencée ou Unreal Engine, produire ultérieurement une vraie heightmap et une projection cohérente.

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
- Carte artistique interactive, **pas de système GIS** ni de coordonnées réelles.
- Les textes institutionnels non décidés sont explicitement marqués comme « en conception ».
- Il n'y a pas de site public publié automatiquement par l'archive ZIP : la mise en ligne nécessite votre propre dépôt GitHub.

## Technologies

HTML5, CSS3, JavaScript natif, Python standard (générateur facultatif). Pas de dépendances npm, pas de backend. La première version privilégie une publication directe sur GitHub Pages plutôt qu'un framework nécessitant une chaîne de compilation.

## Crédits

Visuels originaux d'Arélia générés au cours de cette conversation ; contenus de fiction. Ne pas présenter le portail comme une vraie autorité publique.
