#!/usr/bin/env python3
"""Étape 2 — Routes aériennes : jointure aéroports → pays puis agrégation par couple de pays.
Entrées : data/airports.dat, data/routes.dat, data/country-aliases.json
Sortie  : data/processed/routes_by_country_pair.csv
Ne garde que les routes directes (0 escale) entre deux pays différents."""
import csv, json
from collections import defaultdict
from common import DATA, norm, write_csv

aliases = json.loads((DATA / 'country-aliases.json').read_text(encoding='utf-8'))
by_id, by_iata = {}, {}
with open(DATA / 'airports.dat', newline='', encoding='utf-8') as f:
    for r in csv.reader(f):
        if len(r) < 8: continue
        iso = aliases.get(norm(r[3]))
        try:
            float(r[6]); float(r[7])
        except ValueError:
            continue
        if not iso: continue
        a = {'id': r[0], 'iso': iso}
        by_id[r[0]] = a
        if r[4] and r[4] != '\\N': by_iata[r[4]] = a

groups = defaultdict(lambda: {'count': 0, 'pairs': set()})
total = mapped = 0
with open(DATA / 'routes.dat', newline='', encoding='utf-8') as f:
    for r in csv.reader(f):
        if len(r) < 8: continue
        total += 1
        src = by_id.get(r[3]) or by_iata.get(r[2])
        dst = by_id.get(r[5]) or by_iata.get(r[4])
        try:
            stops = float(r[7])
        except ValueError:
            stops = 0
        if not src or not dst or src['iso'] == dst['iso'] or stops > 0: continue
        mapped += 1
        g = groups[(src['iso'], dst['iso'])]
        g['count'] += 1
        g['pairs'].add((src['id'], dst['id']))
write_csv('routes_by_country_pair.csv',
          ['origin_iso2', 'destination_iso2', 'route_entries_2014', 'unique_airport_pairs'],
          [[o, d, g['count'], len(g['pairs'])]
           for (o, d), g in sorted(groups.items(), key=lambda kv: (kv[0][0], -kv[1]['count']))])
print(f'  routes retenues : {mapped}/{total}')
