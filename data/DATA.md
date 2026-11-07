# Données du projet

## Sources brutes (non versionnées, téléchargées par `scripts/download_data.py`)
| Fichier | Source |
|---|---|
| `passport-index-tidy-iso2.csv` | https://github.com/imorte/passport-index-data (2026) |
| `airports.dat`, `routes.dat` | https://openflights.org/data.php (arrêt des mises à jour : juin 2014) |
| `countries.geojson` | https://github.com/datasets/geo-countries |

## Fichiers manuels
- `events.json` : événements géopolitiques datés, avec URL de source officielle.
- `country-aliases.json` : correspondance nom de pays normalisé → code ISO-2.

## Données traitées (`data/processed/`, produites par `scripts/process_data.py`)

### `visas_clean.csv` (39 601 lignes)
| Colonne | Description |
|---|---|
| `passport_iso2` | Pays du passeport (ISO-2) |
| `destination_iso2` | Pays de destination (ISO-2) |
| `requirement_raw` | Valeur brute (`visa free`, `90`, `eta`, `e-visa`, `visa required`, `-1`…) |
| `category` | `free`, `arrival`, `eta`, `evisa`, `required`, `blocked`, `own`, `unknown` |
| `accessible_without_prior_visa` | `oui` si `free`, `arrival` ou `eta` |

### `routes_by_country_pair.csv` (4 514 lignes)
| Colonne | Description |
|---|---|
| `origin_iso2`, `destination_iso2` | Couple de pays reliés par au moins une route directe internationale |
| `route_entries_2014` | Nombre de lignes OpenFlights (une ligne = une compagnie sur une route ; ce n'est pas un nombre de vols) |
| `unique_airport_pairs` | Nombre de couples d'aéroports distincts |

### `country_stats.csv` (199 lignes)
| Colonne | Description |
|---|---|
| `passport_iso2` | Pays du passeport |
| `mobility_score_2026` | Destinations sans visa, à l'arrivée ou ETA |
| `visa_free_count` | Destinations `free` uniquement |
| `visa_required_count` | Destinations `visa required` |
| `visa_records` | Enregistrements hors `own` et `unknown` |
| `connected_countries_2014` | Pays distincts reliés en direct |
| `route_entries_2014` | Total des lignes OpenFlights au départ du pays |

**Limites** : sources de 2026 (visas) et 2014 (routes), non contemporaines ; seules 34 654 des 67 663 lignes de routes sont retenues (directes, internationales, aéroports rattachés à un pays).
