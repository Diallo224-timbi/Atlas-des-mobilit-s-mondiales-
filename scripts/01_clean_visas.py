#!/usr/bin/env python3
"""Étape 1 — Nettoyage des visas.
Entrée : data/passport-index-tidy-iso2.csv   Sortie : data/processed/visas_clean.csv
Catégorise la colonne « Requirement » en 8 classes et marque les accès sans visa préalable."""
import csv
from common import DATA, ACCESSIBLE, visa_type, write_csv

rows = []
with open(DATA / 'passport-index-tidy-iso2.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        if r['Passport'] and r['Destination']:
            raw = r['Requirement'].strip()
            t = visa_type(raw)
            rows.append([r['Passport'], r['Destination'], raw, t, 'oui' if t in ACCESSIBLE else 'non'])
rows.sort(key=lambda x: (x[0], x[1]))
write_csv('visas_clean.csv',
          ['passport_iso2', 'destination_iso2', 'requirement_raw', 'category', 'accessible_without_prior_visa'], rows)
