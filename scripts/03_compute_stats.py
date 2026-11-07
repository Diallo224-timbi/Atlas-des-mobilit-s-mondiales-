#!/usr/bin/env python3
"""Étape 3 — Indicateurs par pays et corrélation.
Entrées : data/processed/visas_clean.csv, data/processed/routes_by_country_pair.csv
Sortie  : data/processed/country_stats.csv (+ coefficient de Pearson affiché)"""
import csv
from collections import defaultdict
from common import OUT, ACCESSIBLE, pearson, write_csv

cats = defaultdict(list)
with open(OUT / 'visas_clean.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        cats[r['passport_iso2']].append(r['category'])
connected, entries = defaultdict(int), defaultdict(int)
with open(OUT / 'routes_by_country_pair.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        connected[r['origin_iso2']] += 1
        entries[r['origin_iso2']] += int(r['route_entries_2014'])
stats = [[p,
          sum(t in ACCESSIBLE for t in v), sum(t == 'free' for t in v), sum(t == 'required' for t in v),
          sum(t not in ('own', 'unknown') for t in v), connected[p], entries[p]]
         for p, v in sorted(cats.items())]
write_csv('country_stats.csv',
          ['passport_iso2', 'mobility_score_2026', 'visa_free_count', 'visa_required_count',
           'visa_records', 'connected_countries_2014', 'route_entries_2014'], stats)
pairs = [(s[1], s[5]) for s in stats if s[4] > 150 and s[5] > 0]
print(f'  Pearson mobilité 2026 / pays reliés 2014 : r = {pearson(pairs):.3f} (n = {len(pairs)} pays)')
