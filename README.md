# Borderless — Atlas des mobilités (D3.js)

Application web interactive de visualisation d'information : **visas, connectivité aérienne historique et contexte géopolitique**. Projet en HTML, CSS et **D3.js v7**, sans framework ni serveur backend.

## Démarrage sur Mac, Windows ou Linux

1. Décompresser l'archive.
2. Ouvrir un terminal dans `visa-atlas-d3`.
3. Lancer un serveur HTTP local :

   ```bash
   python3 -m http.server 8000
   ```

4. Ouvrir **http://localhost:8000** dans Chrome, Safari ou Firefox.

> Ne pas ouvrir `index.html` avec `file://` : le chargement local des fichiers JSON est souvent bloqué pour des raisons de sécurité. **Internet est requis au premier lancement** pour D3.js et les jeux de données publics. L'application charge les fichiers de GitHub automatiquement.

Pour télécharger les données dans `data/` en amont (facultatif) :

```bash
python3 scripts/download_data.py
python3 -m http.server 8000
```

Le site utilise d'abord les fichiers locaux s'ils existent, sinon les sources en ligne. Le téléchargement préalable est utile pour la stabilité pendant une présentation. Le CDN D3.js et les polices Google restent chargés en ligne.

## Documentation du projet

- **[docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)** : résumé, utilisateurs et tâches, pipeline (workflow) et fiche de chaque visualisation (mapping, capture, utilité).
- **[data/DATA.md](data/DATA.md)** : sources, pointeurs et dictionnaire des données traitées (`data/processed/`).
- Pipeline : `make data` → `make process` → `make serve` (et `make test`).

## Fonctionnalités

- Carte mondiale des exigences de visa avec **D3 `geoNaturalEarth1`**, survol, zoom, filtres et pays cliquables.
- Réseau des routes aériennes **historiques** au départ du pays choisi, sous forme d'arcs géodésiques.
- Comparaison de deux passeports (surbrillance sur la carte et dans le nuage de points).
- 4 indicateurs calculés : accès sans visa préalable, visas classiques requis, pays reliés en direct, lignes de routes enregistrées.
- Corrélation de Pearson entre score de mobilité du passeport et nombre de pays reliés en 2014.
- Top destinations, heatmap des exigences de visa, fiches détaillées.
- Chronologie géopolitique sourcée : Covid-19, Ukraine, Kosovo, Schengen, ETA britannique ; les événements peuvent surligner les pays concernés.
- Export CSV avec exigences de visa et nombre d'entrées de routes par destination.
- Interface responsive, survols, annotations, état d'erreur et bouton de nouvelle tentative.

## Sources de données et périodes

| Fichier | Source | Date / limite | Usage |
|---|---|---|---|
| `passport-index-tidy-iso2.csv` | [imorte/passport-index-data](https://github.com/imorte/passport-index-data) | Dépôt mis à jour en février **2026** (vérifier README du dépôt si nouvelle mise à jour) | Matrice bilatérale des visas |
| `airports.dat` | [OpenFlights](https://openflights.org/data.php) | Base d'aéroports, utilisée pour localiser les routes historiques | Coordonnées, pays, identifiants |
| `routes.dat` | [OpenFlights](https://openflights.org/data.php) | Arrêt des mises à jour en **juin 2014** | Liaisons aériennes historiques |
| `countries.geojson` | [geo-countries / Natural Earth](https://github.com/datasets/geo-countries) | Contours géographiques | Carte et codes ISO-2 |
| `events.json` | OMS, ONU, Commission européenne, GOV.UK | **2020–2025**, dates et liens individuels | Annotations géopolitiques |

**Attention :** le jeu de visas ci-dessus est une **matrice de Passport Index Data** et **non le classement officiel Henley**. L'application calcule un indicateur de mobilité à partir de cette matrice. Pour utiliser les séries Henley / Kaggle, il faut ajouter une source annuelle homogène et documenter sa définition. L'utilisation du dataset de Kaggle n'est pas nécessaire pour cette version.

### Calcul des indicateurs

- **Accès sans visa préalable** : `visa free`, durée numérique de séjour libre, `visa on arrival`, ou `eta`. Ce calcul **inclut** l'ETA et le visa délivré à l'arrivée ; il n'est pas équivalent au « nombre de pays strictement sans formalité ».
- **Visa à demander** : uniquement la catégorie `visa required`. Les `e-visa` sont séparés et non comptés dans cet indicateur.
- **Pays reliés** : nombre de **pays de destination distincts** qui ont au moins une route internationale directe sortante recensée depuis un aéroport du pays d'origine dans OpenFlights 2014.
- **Liaisons enregistrées** : nombre de lignes OpenFlights rattachées aux couples origine/destination (compagnies et itinéraires peuvent être représentés séparément). Ce n'est **pas** un nombre de vols réalisés, une fréquence, une offre actuelle ou un trafic de passagers.
- **Corrélation** : Pearson calculé sur les pays présents dans les deux sources et disposant de données comparables dans le format du tableau. **Cette corrélation descriptive 2026/2014 ne permet aucune conclusion causale.**

### Historique / géopolitique

Le curseur chronologique contrôle **uniquement l'affichage des annotations**, pas les données quantitatives. Les visas ne sont pas recalculés année par année et les routes n'évoluent pas dans le temps : nous n'avons pas inventé de séries historiques manquantes. Un effet éventuel d'un événement sur les visas ou les vols doit être vérifié avec d'autres données datées avant de faire une analyse « avant / après ».

### Limites techniques

- Jointure des routes aux pays par les identifiants d'aéroports OpenFlights, complétée par les codes IATA lorsque possible.
- Correspondance des noms de pays d'aéroports à des codes ISO-2 via `data/country-aliases.json` ; certains territoires, anciennes dénominations ou routes non mappables peuvent être exclus.
- Les pays sont colorés selon les exigences du passeport sélectionné ; les pays absents de la matrice restent en gris.
- Les règles d'entrée dépendent du motif et de la durée du voyage, du type de passeport et d'autres critères. Les données ne remplacent **jamais** les informations consulaires officielles.
- Les sources web peuvent devenir temporairement indisponibles. Le téléchargement préalable des données stabilise une démo.

## Architecture

```text
visa-atlas-d3/
├── index.html                 Interface et sections de visualisation
├── src/
│   ├── styles.css             UI responsive sombre
│   └── app.js                 Chargement, nettoyage, agrégation, visualisations D3
├── data/
│   ├── country-aliases.json   Correspondances noms de pays → ISO-2
│   ├── events.json            Événements vérifiés avec URL des sources
│   └── [fichiers téléchargeables en option]
├── docs/                      Documentation, schéma du pipeline, captures d'écran
├── scripts/
│   ├── download_data.py      Mise en cache des fichiers publics
│   ├── 01_clean_visas.py     Étape 1 : visas → data/processed/
│   ├── 02_aggregate_routes.py Étape 2 : routes par couple de pays
│   ├── 03_compute_stats.py   Étape 3 : indicateurs + Pearson
│   ├── process_data.py       Lance 01 → 02 → 03
│   └── common.py             Fonctions partagées
└── tests/
    └── test-transformations.js
```

## Tests

Avec Node.js installé :

```bash
node tests/test-transformations.js
```

Test sans dépendance npm : catégorisation des visas, agrégation des routes, pays reliés, calcul du score.

## Idées pour un sprint 2

1. Importer le **Henley Passport Index** annuel avec un schéma et des années vérifiés ; faire une **vraie** courbe temporelle du score.
2. Ajouter une source **datée** de fréquences réelles de vols (ou du trafic de passagers), disponible sur plusieurs années, pour étudier les changements.
3. Définir un jeu de cas géopolitiques très précis et documenter chaque changement réglementaire avec la date d'entrée en vigueur.
4. Tester les visualisations avec quelques tâches utilisateurs : trouver une destination, comparer deux nationalités, repérer un écart entre accessibilité juridique et liaisons historiques.

## Crédit / licences

- D3.js : licence ISC.
- OpenFlights : Open Database License (ODbL) ; la redistribution d'une base dérivée publiée peut nécessiter un partage sous licence ouverte avec attribution. Lire les termes sur openflights.org.
- Passport Index Data : licence MIT indiquée dans le dépôt source.
- Natural Earth / geo-countries : voir les crédits du dépôt source.
- Notes factuelles : liens officiels par événement dans `data/events.json`.
