#!/usr/bin/env python3
"""Télécharge les fichiers publics optionnels pour un usage local (Python standard)."""
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parents[1] / 'data'
SOURCES = {
    'passport-index-tidy-iso2.csv': 'https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso2.csv',
    'airports.dat': 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat',
    'routes.dat': 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat',
    'countries.geojson': 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
}

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    failures = []
    for filename, url in SOURCES.items():
        print(f'→ {filename} ...', flush=True)
        try:
            dest, _ = urlretrieve(url, ROOT / filename)
            print(f'  OK : {Path(dest).stat().st_size / 1024:.0f} Ko')
        except Exception as exc:
            failures.append(filename)
            print(f'  ÉCHEC : {exc}')
    print('\nTéléchargement terminé.' if not failures else f'\nFichiers manquants : {", ".join(failures)}')
